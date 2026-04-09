// Run this to reset the database and update Lohitaksh's password.
// Execute with: node reset-firebase.js
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
    password: "admin", // CHANGED PASSWORD
    role: "admin",
    coins: 0
  }
};

async function reset() {
  console.log("Resetting users and password...");
  for (const [id, user] of Object.entries(users)) {
    await fetch(`${FIREBASE_URL}/users/${id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    console.log(`Reset user: ${id}`);
  }

  console.log("Clearing all logs, tasks, and history...");
  
  const nodesToClear = ['logs', 'goals', 'redeemed'];
  
  for (const node of nodesToClear) {
    await fetch(`${FIREBASE_URL}/${node}.json`, {
      method: 'DELETE'
    });
    console.log(`Cleared: ${node}`);
  }
  
  console.log("Done! Everything is fresh.");
}

reset().catch(console.error);
