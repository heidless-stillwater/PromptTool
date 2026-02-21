import { adminDb } from './src/lib/firebase-admin';
async function run() {
  const snap = await adminDb.collection('users').where('username', '==', 'heidless').get();
  snap.forEach(doc => {
    console.log('UID:', doc.id);
    console.log('Data:', doc.data());
  });
}
run();
