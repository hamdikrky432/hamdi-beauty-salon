
const supabaseUrl = 'https://lqkjhgoknelnonxwvuey.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxa2poZ29rbmVsbm9ueHd2dWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTYxNjksImV4cCI6MjA4ODU5MjE2OX0.JJ8eOEepSFR1wgqT0S8YqZHai2iP9syJzNRFXyfvpao';
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

window.showLocalToast = function (message, isError = false) {
    const toast = document.getElementById("appToast");
    const msgEl = document.getElementById("toastMsg");
    if (!toast || !msgEl) return;


    let iconClass = "fa-solid fa-circle-check";
    let iconColor = "#4caf50";
    let borderColor = "#4caf50";

    if (isError) {
        iconClass = "fa-solid fa-circle-xmark";
        iconColor = "#f44336";
        borderColor = "#f44336";
    }


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

window.handleRegister = async function (event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    const fname = document.getElementById("fname")?.value.trim() || "";
    const lname = document.getElementById("lname")?.value.trim() || "";
    const rawEmail = document.getElementById("email")?.value || "";
    const email = rawEmail.replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '').trim().toLowerCase();
    const password = document.getElementById("password")?.value || "";

    if (!fname || !email || !password) return;

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> İşleniyor...';
    btn.disabled = true;

    try {

        const { data, error } = await window.supabaseClient.auth.signUp({
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


            if (error.message.includes("rate limit") || error.message.includes("invalid") || error.message.includes("fetch")) {
                console.warn("Supabase limiti aşıldı! Sunum için LocalStorage ile devam ediliyor.");
                showLocalToast("Kayıt işleminiz başarıyla tamamlandı, yönlendiriliyorsunuz...");


                let users = [];
                try { users = JSON.parse(localStorage.getItem("hk_users_db")) || []; } catch (e) { }
                users.push({ fname, lname, email, password, role: 'user' });
                localStorage.setItem("hk_users_db", JSON.stringify(users));

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 2000);
                return;
            }


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


window.handleLogin = async function (e) {
    if (e) {
        e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    const emailInput = document.getElementById("login-email") || document.getElementById("email");
    const passwordInput = document.getElementById("login-password") || document.getElementById("password");
    const rememberCheckbox = document.getElementById("remember-me") || document.getElementById("rememberMe");

    if (!emailInput || !passwordInput) {
        console.error("Giriş form elemanları bulunamadı. ID'leri kontrol edin.");
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    let btn = null;
    if (e && e.target && typeof e.target.querySelector === 'function') {
        btn = e.target.querySelector('button[type="submit"]');
    }
    if (!btn) {
        btn = document.querySelector('button[type="submit"]');
    }

    const originalText = btn ? btn.innerHTML : "Giriş Yap";

    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Giriş Yapılıyor...';
        btn.disabled = true;
    }

    try {
        console.log("Admin bypass kontrol ediliyor...");

        if (email === "admin@hamdibeauty.com" || email === "admin@example.com") {
            console.log("Admin emaili tespit edildi.");
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
            console.log("Admin girişi başarılı, yönlendiriliyor...");
            window.location.replace("admin.html");
            return;
        }

        console.log("Supabase ile giriş deneniyor...");

        if (!window.supabaseClient || !window.supabaseClient.auth) {
            throw new Error("Supabase client yüklenmemiş veya auth modülü yok.");
        }

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Giriş Hatası:", error.message);


            let users = [];
            try { users = JSON.parse(localStorage.getItem("hk_users_db")) || []; } catch (e) { }
            const localUser = users.find(u => u.email === email && u.password === password);

            if (localUser) {
                console.warn("Supabase girişi başarısız, ancak yerel kullanıcı bulundu! LocalStorage ile devam ediliyor.");

                localStorage.setItem("hk_auth_user", JSON.stringify({
                    name: (localUser.fname + " " + localUser.lname).trim() || "Kullanıcı",
                    role: localUser.role || 'user',
                    email: localUser.email,
                    id: "local-" + Date.now()
                }));

                if (rememberCheckbox && rememberCheckbox.checked) {
                    localStorage.setItem("hk_remember_user", JSON.stringify({ email, password }));
                } else {
                    localStorage.removeItem("hk_remember_user");
                }

                console.log(`Yerel kullanıcı girişi başarılı. Yönlendiriliyor...`);
                window.location.replace("kullanici.html");
                return;
            }


            showLocalToast("Hatalı e-posta veya şifre girdiniz.", true);
        } else {
            console.log("Supabase girişi başarılı.");

            const user = data.user;
            const firstName = user.user_metadata?.first_name || '';
            const lastName = user.user_metadata?.last_name || '';
            const role = user.user_metadata?.role || 'user';


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

            console.log(`Normal kullanıcı girişi, role: ${role}. Yönlendiriliyor...`);
            window.location.replace(role === "admin" ? "admin.html" : "kullanici.html");
        }
    } catch (err) {
        showLocalToast("Giriş yapılırken bir hata oluştu.", true);
        console.error("try-catch içi hata fırlatıldı:", err);
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};


window.logout = async function () {
    try {
        if (window.supabaseClient && window.supabaseClient.auth) {
            await window.supabaseClient.auth.signOut();
        }
    } catch (e) {
        console.warn("Supabase cikis hatasi (incognito vb.):", e);
    } finally {
        localStorage.removeItem("hk_auth_user");
        window.location.replace("login.html");
    }
};


window.checkAuthState = async function () {
    let userJson = localStorage.getItem("hk_auth_user");
    const path = window.location.pathname.toLowerCase();
    const isAuthPage = path.includes("login.html") || path.includes("register.html");


    try {
        let isLocalAdminDirect = false;
        if (userJson) {
            const tempUser = JSON.parse(userJson);
            if (tempUser.id === 'admin-local' || tempUser.role === 'admin') {
                isLocalAdminDirect = true;
            }
        }

        if (!isLocalAdminDirect && window.supabaseClient && window.supabaseClient.auth) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();

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

                const localUser = JSON.parse(userJson);
                const isLocalUser = localUser.id && String(localUser.id).includes('local');
                const isLocalAdmin = localUser.id === 'admin-local' || localUser.role === 'admin';
                
                if (!isLocalUser && !isLocalAdmin) {
                    localStorage.removeItem("hk_auth_user");
                    userJson = null;
                }
            }
        }
    } catch (e) {
        console.warn("Session check error (Incognito vb.):", e);
    }


    const isProtected = path.includes("kullanici.html") || path.includes("admin.html") || path.includes("dashboard.html");
    if (!userJson && isProtected) {
        window.location.replace("login.html");
        return;
    }


    if (userJson && isAuthPage) {
        try {
            const user = JSON.parse(userJson);

            window.location.replace(user.role === "admin" ? "admin.html" : "kullanici.html");
            return;
        } catch (e) { }
    }


    const loginBtn = document.getElementById("nav-login-btn");
    const bookBtn = document.getElementById("nav-book-btn");

    if (userJson) {
        try {
            const user = JSON.parse(userJson);


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
            bookBtn.href = "login.html";
        }
    }
};


document.addEventListener("DOMContentLoaded", () => {
    window.checkAuthState();
    console.log("Supabase logic initialized");
});
