import * as dotenv from 'dotenv';
dotenv.config();
import { adminDb } from './src/lib/firebase-admin';

async function run() {
  try {
    const userSnap = await adminDb.collection('users').where('username', '==', 'heidless').get();
    if (userSnap.empty) {
      console.log('User heidless not found');
      return;
    }
    const uid = userSnap.docs[0].id;
    console.log('Found UID:', uid);

    const imagesSnap = await adminDb.collection('users').doc(uid).collection('images').get();
    console.log('Total images found:', imagesSnap.size);
    
    const robotImages = imagesSnap.docs.filter(d => d.data().prompt.toLowerCase().includes('robot'));
    console.log('Robot images count:', robotImages.length);
    robotImages.forEach(d => {
      console.log('ID:', d.id);
      console.log('Prompt:', d.data().prompt);
      console.log('Created:', d.data().createdAt?.toDate());
    });
  } catch (e) {
    console.error(e);
  }
}
run();
