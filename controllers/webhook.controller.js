import Subscription from '../models/Subscription.model.js';
import User from '../models/User.model.js';

export const handleRevenueCatWebhook = async (req, res) => {
    try {
        const { event } = req.body;
        console.log("RevenueCat Webhook Event:", event);
        // RevenueCat sends a test event when validating the webhookURL
        if (event.type === 'TEST') {
            return res.status(200).json({ success: true, message: 'Test event received' });
        }

        const {
            type: eventType,
            app_user_id,
            product_id,
            purchased_at_ms,
            expiration_at_ms,
            store,
            environment,
            cancel_reason,
            price,
            transaction_id
        } = event;

        // Use app_user_id from RevenueCat to find the user.
        // In our createSubscription API we set revenuecatId (app_user_id) = User._id
        const user = await User.findById(app_user_id);
        if (!user) {
            console.warn(`Webhook Error: User not found for app_user_id: ${app_user_id}`);
            // Returning 200 so RevenueCat doesn't keep retrying if the user was deleted
            return res.status(200).json({ success: true, message: 'User not found, ignoring event' });
        }

        // Parse dates from MS
        const purchasedAt = purchased_at_ms ? new Date(purchased_at_ms) : new Date();
        const expirationAt = expiration_at_ms ? new Date(expiration_at_ms) : new Date();

        // Parse Plan from product ID (assuming products are named something like Kegal360_monthly_499)
        let plan = 'free';
        let isYearly = typeof product_id === 'string' && product_id.toLowerCase().includes('year');
        let isMonthly = typeof product_id === 'string' && product_id.toLowerCase().includes('month');

        if (isYearly) plan = 'yearly';
        else if (isMonthly) plan = 'monthly';

        // Find the current subscription for this user
        let subscription = await Subscription.findOne({ user: user._id });

        if (!subscription) {
            // Create if it doesn't exist (e.g. they purchased on a different platform before opening the app)
            subscription = new Subscription({
                user: user._id,
                plan,
                revenuecatId: app_user_id,
                store: store || 'null',
                environment: environment || 'null',
                paymentStatus: 'pending'
            });
        }

        // Update common fields
        subscription.store = store || subscription.store;
        subscription.environment = environment || subscription.environment;

        // Handle Event Types
        switch (eventType) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
            case 'UNCANCELLATION':
                subscription.planState = 'active';
                subscription.paymentStatus = 'completed';
                subscription.autoRenew = true;
                subscription.plan = plan !== 'free' ? plan : subscription.plan;
                if (transaction_id) subscription.paymentId = transaction_id;

                if (purchased_at_ms) subscription.startDate = purchasedAt;
                if (expiration_at_ms) subscription.endDate = expirationAt;

                subscription.cancelledAt = null;
                subscription.cancellationReason = null;
                if (price !== undefined) subscription.price = price;
                break;

            case 'CANCELLATION':
                // Subscription remains active until the expiration date
                subscription.autoRenew = false;
                subscription.cancelledAt = new Date();
                subscription.cancellationReason = cancel_reason || 'UNSUBSCRIBE';
                // Note: The script should theoretically handle cron-jobs to expire this later, 
                // but RevenueCat will also fire EXPIRATION when the time comes.
                break;

            case 'EXPIRATION':
                subscription.planState = 'expire';
                subscription.autoRenew = false;
                break;

            case 'NON_RENEWING_PURCHASE':
                subscription.planState = 'active';
                subscription.paymentStatus = 'completed';
                subscription.autoRenew = false;
                subscription.plan = plan !== 'free' ? plan : subscription.plan;

                if (purchased_at_ms) subscription.startDate = purchasedAt;
                if (expiration_at_ms) subscription.endDate = expirationAt;
                break;

            case 'SUBSCRIPTION_PAUSED':
            case 'REFUND':
                subscription.planState = 'inactive';
                subscription.paymentStatus = 'failed';
                subscription.autoRenew = false;
                break;

            case 'PRODUCT_CHANGE':
                subscription.plan = plan !== 'free' ? plan : subscription.plan;
                if (expiration_at_ms) subscription.endDate = expirationAt;
                break;

            case 'BILLING_ISSUE':
                // A billing issue occurred, typically we enter a grace period. 
                // For simplicity, we keep it active but autoRenew might fail on Expiration.
                subscription.paymentStatus = 'failed';
                console.log(`Billing issue logged for user ${user._id}`);
                break;

            case 'TRANSFER':
                // We handle transfer by setting revenuecatId as the new app_user_id
                // Because we fetched the new app_user_id above, it will create/update the subscription for the new user.
                break;

            default:
                console.log(`Unhandled RevenueCat Webhook Event Type: ${eventType}`);
                break;
        }

        await subscription.save();

        // Sync with User object
        user.subscription = {
            plan: subscription.plan,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            planState: subscription.planState,
            isActive: subscription.planState === 'active', // Legacy prop support
            paymentId: subscription.paymentId // Or original_transaction_id if preferred
        };
        await user.save();

        return res.status(200).json({ success: true, message: 'Webhook processed successfully' });

    } catch (error) {
        console.error('Error processing RevenueCat webhook:', error);
        // Return 500 so RevenueCat will retry
        return res.status(500).json({ success: false, message: 'Internal server error processing webhook' });
    }
};

export default { handleRevenueCatWebhook };
