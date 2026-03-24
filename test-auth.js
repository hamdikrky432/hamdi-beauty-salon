const url = "https://lqkjhgoknelnonxwvuey.supabase.co/auth/v1/token?grant_type=password";
const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxa2poZ29rbmVsbm9ueHd2dWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTYxNjksImV4cCI6MjA4ODU5MjE2OX0.JJ8eOEepSFR1wgqT0S8YqZHai2iP9syJzNRFXyfvpao";

fetch(url, {
  method: "POST",
  headers: {
    "apikey": apikey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ email: "testgrad123@example.com", password: "password123" })
}).then(r => r.json()).then(console.log).catch(console.error);
