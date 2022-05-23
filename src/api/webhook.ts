import express, { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import Subscription from "../entities/Subscription";
import User from "../entities/User";
import { stripe } from "../index";
const router = express.Router();

function parsePaymentInfo(event: Stripe.Event) {
    const object = event.data.object as any;
    const charge = object.charges.data[0];

    const id = object.charges.data[0].payment_intent
    const email = charge.billing_details.email;
    const amount = charge.amount;
    return { id, email, amount };
}

function parseRefundInfo(event: Stripe.Event) {
    const object = event.data.object as any;

    const id = object.payment_intent
    return { id };
}

async function payment(event: Stripe.Event) {
    const { id, email, amount } = parsePaymentInfo(event);

    const user = await User.findOne({ email });

    //TODO handle the fact that someone paid without having an account with that email, by sending them an email for e.g.
    if (!user) return;

    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + 31);

    console.log("from to ", from, to)

    await Subscription.create({
        id,
        userId: user.id,
        type: "premium",
        from,
        to
    }).save();
}

async function refund(event: Stripe.Event) {
    const { id } = parseRefundInfo(event);

    await Subscription.delete(id);
}

router.post('/', express.raw({ type: "application/json" }), (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) res.sendStatus(403);

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_ENDPOINT || "");
    } catch (e) {
        res.status(400).send(`Webhook Error: ${e.message}`);
        return;
    }

    // Handle the event
    console.log(`Event type ${event.type}`);
    switch (event.type) {
        case 'payment_intent.succeeded':
            payment(event);
            break;
        case 'charge.refunded':
            refund(event);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
});

export default router;
