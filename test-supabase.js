const supabaseUrl = "https://lqkjhgoknelnonxwvuey.supabase.co/rest/v1/appointments";
const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxa2poZ29rbmVsbm9ueHd2dWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTYxNjksImV4cCI6MjA4ODU5MjE2OX0.JJ8eOEepSFR1wgqT0S8YqZHai2iP9syJzNRFXyfvpao";

async function test() {
  const insertBody = {
    user_name: "Test User 2",
    service: "Medikal Manikür",
    price: "650",
    date: "2026-03-15",
    time: "10:00",
    expert: "Selin",
    status: "pending"
  };

  try {
    const res = await fetch(supabaseUrl, {
        method: "POST",
        headers: {
            "apikey": apikey,
            "Authorization": "Bearer " + apikey,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(insertBody)
    });
    const data = await res.json();
    console.log("INSERT RESULT:", JSON.stringify(data));
  } catch(e) {
    console.log("INSERT ERROR:", e.toString());
  }

  try {
    const res = await fetch(supabaseUrl + "?select=*", {
      method: "GET",
      headers: {
        "apikey": apikey,
        "Authorization": "Bearer " + apikey,
      }
    });
    const data = await res.json();
    console.log("GET RESULT:", JSON.stringify(data));
  } catch(e) {
    console.log("GET ERROR:", e.toString());
  }
}
test();
