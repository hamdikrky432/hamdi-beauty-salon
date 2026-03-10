/* Supabase Configuration */
const supabaseUrl = 'https://lqkjhgoknelnonxwvuey.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxa2poZ29rbmVsbm9ueHd2dWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTYxNjksImV4cCI6MjA4ODU5MjE2OX0.JJ8eOEepSFR1wgqT0S8YqZHai2iP9syJzNRFXyfvpao';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Başa tutturulan yardımcı fonksiyonlar
window.showLocalToast = function (message, isError = false) {
    const toast = document.getElementById("appToast");
    const msgEl = document.getElementById("toastMsg");
    if (!toast || !msgEl) return;

    // Varsayılan ikon
    let iconClass = "fa-solid fa-circle-check";
    let iconColor = "#4caf50";
    let borderColor = "#4caf50";

    if (isError) {
        iconClass = "fa-solid fa-circle-xmark";
        iconColor = "#f44336";
        borderColor = "#f44336";
    }

    // İkon var mı kontrol et, yoksa sadece mesajı göster
    const iconEl = toast.querySelector("i");
    if (iconEl) {
        iconEl.className = iconClass;
        iconEl.style.color = iconColor;
    }

    msgEl.textContent = message;
    toast.style.borderLeft = `4px solid ${borderColor}`;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
};

// --- AUTH İŞLEMLERİ ---

// Kayıt Ol (Register)
window.handleRegister = async function (event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    const fname = document.getElementById("fname")?.value.trim() || "";
    const lname = document.getElementById("lname")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("password")?.value || "";

    if (!fname || !email || !password) return;

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> İşleniyor...';
    btn.disabled = true;

    try {
        // 1. Supabase Auth ile Kullanıcı Oluşturma
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    first_name: fname,
                    last_name: lname,
                    role: 'user'
                }
            }
        });

        if (error) {
            console.error("Kayıt Hatası:", error.message);
            let errorMessage = "Kayıt sırasında bir hata oluştu.";
            if (error.message.includes("User already registered")) {
                errorMessage = "Bu e-posta adresi zaten kayıtlı.";
            } else if (error.message.includes("Password should be")) {
                errorMessage = "Şifre en az 6 karakter olmalıdır.";
            } else {
                errorMessage = "Veritabanı bağlantı hatası: " + error.message;
            }
            showLocalToast(errorMessage, true);
        } else {
            showLocalToast("Kayıt işleminiz başarıyla tamamlandı, yönlendiriliyorsunuz...");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        }
    } catch (err) {
        showLocalToast("Beklenmeyen bir hata oluştu.", true);
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// Giriş Yap (Login)
window.handleLogin = async function (event) {
    event.preventDefault();
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberCheckbox = document.getElementById("rememberMe");

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Giriş Yapılıyor...';
    btn.disabled = true;

    try {
        // Admin Girişi (Hardcoded Bypass)
        if (email === "admin@hamdibeauty.com" || email === "admin@example.com") {
            if (password !== "admin123" && password !== "admin") {
                showLocalToast("Hatalı yönetici şifresi.", true);
                throw new Error("Hatalı yönetici şifresi.");
            }
            localStorage.setItem("hk_auth_user", JSON.stringify({
                name: "Yönetici",
                role: "admin",
                email: email,
                id: "admin-local"
            }));
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem("hk_remember_user", JSON.stringify({ email, password }));
            } else {
                localStorage.removeItem("hk_remember_user");
            }
            window.location.href = "admin.html";
            return;
        }

        // Supabase ile Giriş
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Giriş Hatası:", error.message);
            showLocalToast("Hatalı e-posta veya şifre girdiniz.", true);
        } else {
            // Başarılı giriş
            const user = data.user;
            const firstName = user.user_metadata?.first_name || '';
            const lastName = user.user_metadata?.last_name || '';
            const role = user.user_metadata?.role || 'user';

            // Mevcut sisteme uyum için localstorage günceliyoruz
            localStorage.setItem("hk_auth_user", JSON.stringify({
                name: (firstName + " " + lastName).trim() || "Kullanıcı",
                role: role,
                email: user.email,
                id: user.id
            }));

            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem("hk_remember_user", JSON.stringify({ email, password }));
            } else {
                localStorage.removeItem("hk_remember_user");
            }

            // Normal kullanıcıyı hesaba sok
            window.location.href = role === "admin" ? "admin.html" : "kullanici.html";
        }
    } catch (err) {
        showLocalToast("Giriş yapılırken bir hata oluştu.", true);
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// Çıkış Yap (Logout)
window.logout = async function () {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.log("Supabase cikis hatasi", e);
    }
    localStorage.removeItem("hk_auth_user");
    window.location.href = "login.html";
};

// Oturum Durumunu Kontrol Et
window.checkAuthState = async function () {
    let userJson = localStorage.getItem("hk_auth_user");
    const path = window.location.pathname.toLowerCase();
    const isAuthPage = path.includes("login.html") || path.includes("register.html");

    // Supabase session'ı kontrol edelim (Gerçek doğrulama)
    try {
        const { data: { session } } = await supabase.auth.getSession();

        // Eğer supabase session varsa ve localde yoksa senkronize et (veya tam tersi)
        if (session && !userJson) {
            const user = session.user;
            const newUserJson = JSON.stringify({
                name: (user.user_metadata?.first_name + " " + user.user_metadata?.last_name).trim() || "Kullanıcı",
                role: user.user_metadata?.role || 'user',
                email: user.email,
                id: user.id
            });
            localStorage.setItem("hk_auth_user", newUserJson);
            userJson = newUserJson;
        } else if (!session && userJson) {
            // Sadece admin hesabı değilse local session'ı sil
            const localUser = JSON.parse(userJson);
            if (localUser.role !== 'admin') {
                localStorage.removeItem("hk_auth_user");
                userJson = null;
            }
        }
    } catch (e) {
        console.error("Session check error:", e);
    }

    // Korunan sayfa kontrolü
    if (!userJson && (path.includes("kullanici.html") || path.includes("admin.html") || path.includes("dashboard.html"))) {
        window.location.href = "login.html";
        return;
    }

    // Login/Register sayfasındaysak ve zaten giriş yapılıysa yönlendir
    if (userJson && isAuthPage) {
        try {
            const user = JSON.parse(userJson);
            // Sadece register sayfasından login'e geldiğinde bile admin.html/index.html yönlendirmesi çalışmalı
            window.location.href = user.role === "admin" ? "admin.html" : "kullanici.html";
            return;
        } catch (e) { }
    }

    // Navbar Butonlarını Güncelle
    const loginBtn = document.getElementById("nav-login-btn");
    const bookBtn = document.getElementById("nav-book-btn");

    if (userJson) {
        try {
            const user = JSON.parse(userJson);

            // Navbar Güncellemeleri
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fa-regular fa-user"></i> Panele Git';
                loginBtn.href = user.role === "admin" ? "admin.html" : "kullanici.html";
                loginBtn.classList.remove("btn--outline");
                loginBtn.classList.add("btn--primary");
                loginBtn.style.background = "#333";
                loginBtn.style.color = "#fff";
                loginBtn.style.borderColor = "#333";
            }

            if (bookBtn) {
                if (user.role === "admin") {
                    bookBtn.style.display = "none";
                } else {
                    bookBtn.href = "kullanici.html";
                }
            }

            // Sayfa içindeki dinamik isimleri güncelle
            const userNameElements = document.querySelectorAll(".dynamic-user-name");
            userNameElements.forEach(el => {
                el.textContent = user.name || "Kullanıcı";
            });

        } catch (e) { }
    } else {
        // Oturum yoksa
        const userNameElements = document.querySelectorAll(".dynamic-user-name");
        userNameElements.forEach(el => {
            el.textContent = "Misafir";
        });

        if (loginBtn) {
            loginBtn.innerHTML = 'Giriş Yap';
            loginBtn.href = "login.html";
        }
        if (bookBtn) {
            bookBtn.href = "login.html"; // Misafiri önce logine at
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.checkAuthState();
});
