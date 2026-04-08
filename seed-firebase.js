// Run this ONCE to seed users into Firebase.
// Execute with: node seed-firebase.js
// from the site-goals-rewards directory

const FIREBASE_URL = "https://sh-backend-a0f3c-default-rtdb.asia-southeast1.firebasedatabase.app";

const users = {
  shreeya: {
    username: "Shreeya",
    password: "shreeya",
    role: "student",
    coins: 0
  },
  lohitaksh: {
    username: "Lohitaksh",
    password: "lohitaksh",
    role: "admin",
    coins: 0
  }
};

async function seed() {
  for (const [id, user] of Object.entries(users)) {
    const res = await fetch(`${FIREBASE_URL}/users/${id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    console.log(`Seeded user: ${id}`, data);
  }
  console.log("Done! Firebase users seeded.");
}

seed().catch(console.error);
