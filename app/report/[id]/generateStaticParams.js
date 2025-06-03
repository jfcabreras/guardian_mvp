
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export async function generateStaticParams() {
  try {
    const reportsSnapshot = await getDocs(collection(db, "reports"));
    const paths = reportsSnapshot.docs.map((doc) => ({
      id: doc.id,
    }));
    
    return paths;
  } catch (error) {
    console.error("Error generating static params:", error);
    // Return empty array if Firebase is not accessible during build
    return [];
  }
}
