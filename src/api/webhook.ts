import express from "express";
import { ONE_MONTH_SUBSCRIPTION_AMOUNT, THREE_MONTHS_SUBSCRIPTION_AMOUNT } from "../constants";
import Subscription from "../entities/Subscription";
import User from "../entities/User";
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_KEY || "", {
    apiVersion: "2020-08-27"
});
const router = express.Router();

function getSubscriptionDates(amount: number): { from: Date, to: Date, error: boolean } {
    let error = false;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);

    if      (amount === ONE_MONTH_SUBSCRIPTION_AMOUNT)    to.setDate(to.getDate() + 31);
    else if (amount === THREE_MONTHS_SUBSCRIPTION_AMOUNT) to.setDate(to.getDate() + 31 * 3);
    else error = true;

    return { from, to, error };
}

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

    const { from, to, error } = getSubscriptionDates(amount);

    if (error) {
        console.error("Subscription with anormal value:", id, email, amount);
        return;
    }

    await Subscription.create({
        id,
        userId: user.id,
        type: "premium",
        from,
        to
    }).save();

    user.currentSubscription = "premium";
    user.save();
}

async function refund(event: Stripe.Event) {
    //TODO set user.currentSubscription field to "free"
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
