// Generates a VAPID key pair for web push. Put the printed lines into the production .env once;
// changing the keys later invalidates every browser subscription.
const webpush = require('web-push');
const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:admin@your-domain');
