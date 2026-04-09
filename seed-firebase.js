// Run this to seed users and rewards into Firebase.
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

const rewards = {
  r1: { name: "Eatables", cost: 35, img: "eatables.png" },
  r2: { name: "Dare", cost: 25, img: "dare.png" },
  r3: { name: "Truth", cost: 20, img: "truth.png" },
  r4: { name: "Old Note", cost: 15, img: "note.png" },
  r5: { name: "Photos", cost: 10, img: "photos.png" },
  r6: { name: "Custom Request", cost: 50, img: "custom.png" }
};

async function seed() {
  console.log("Seeding users...");
  for (const [id, user] of Object.entries(users)) {
    const res = await fetch(`${FIREBASE_URL}/users/${id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    console.log(`Seeded user: ${id}`);
  }

  console.log("Seeding rewards...");
  for (const [id, reward] of Object.entries(rewards)) {
    const res = await fetch(`${FIREBASE_URL}/rewards/${id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reward)
    });
    console.log(`Seeded reward: ${reward.name}`);
  }
  
  console.log("Done! Firebase seeded.");
}

seed().catch(console.error);
