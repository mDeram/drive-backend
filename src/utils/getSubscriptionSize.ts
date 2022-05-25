const getSubscriptionSize = (currentSubscription: string): number => {
    if (currentSubscription === "free") return 200 * 1024;
    if (currentSubscription === "premium") return 1024 * 1024;
    return 0;
}

export default getSubscriptionSize;
