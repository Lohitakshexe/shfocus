const FIREBASE_URL = "https://sh-backend-a0f3c-default-rtdb.asia-southeast1.firebasedatabase.app";

async function migrate() {
  console.log("Fetching all goals...");
  const res = await fetch(`${FIREBASE_URL}/goals.json`);
  const data = await res.json();
  
  if (!data) {
    console.log("No goals found.");
    return;
  }
  
  let migratedCount = 0;
  for (const [key, goal] of Object.entries(data)) {
    if (!goal.user_id) {
      await fetch(`${FIREBASE_URL}/goals/${key}/user_id.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify("shreeya")
      });
      migratedCount++;
    }
  }
  console.log(`Migrated ${migratedCount} goals to Shreeya.`);
}

migrate().catch(console.error);
