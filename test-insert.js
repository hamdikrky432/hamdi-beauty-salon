const url = "https://lqkjhgoknelnonxwvuey.supabase.co/rest/v1/appointments";
const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxa2poZ29rbmVsbm9ueHd2dWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTYxNjksImV4cCI6MjA4ODU5MjE2OX0.JJ8eOEepSFR1wgqT0S8YqZHai2iP9syJzNRFXyfvpao";

fetch(url, {
  method: "POST",
  headers: {
    "apikey": apikey,
    "Authorization": "Bearer " + apikey,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({
    user_name: "Test User",
    user_id: null,
    service: "Saç Kesimi",
    price: "100",
    date: "2026-03-12",
    time: "14:00",
    expert: "Ayşe",
    status: "pending"
  })
}).then(r => r.json()).then(console.log).catch(console.error);
