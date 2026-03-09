

document.addEventListener("DOMContentLoaded", () => {

  const header = document.getElementById("header");
  const navToggle = document.getElementById("navToggle");
  const siteNav = document.getElementById("siteNav");

  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      siteNav.classList.toggle("is-open");
    });

    siteNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("is-open");
      });
    });
  }

  const revealElements = document.querySelectorAll(".reveal");

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('reveal--visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const offsetTop = targetElement.getBoundingClientRect().top + window.scrollY - 80; // Array to compensate for sticky header
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth"
        });
      }
    });
  });

  if (document.getElementById("index-services-list")) {
    window.loadIndexServices();
  }
});

window.switchPanel = function (panelId, btnElement) {

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));

  document.getElementById(`panel-${panelId}`).classList.add('active');
  btnElement.classList.add('active');

  if (panelId === 'appointments' && typeof loadUserAppointments === 'function') {
    loadUserAppointments();
  }
  if (panelId === 'all-appointments' && typeof loadAdminAppointments === 'function') {
    loadAdminAppointments();
  }
  if (panelId === 'services' && typeof loadAdminServices === 'function') {
    loadAdminServices();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.showLocalToast = function (message, isError = false) {
  const toast = document.getElementById("appToast");
  const msgEl = document.getElementById("toastMsg");
  const iconEl = toast.querySelector("i");

  if (!toast || !msgEl) return;

  msgEl.textContent = message;

  if (isError) {
    toast.style.borderLeft = "4px solid #f44336";
    iconEl.className = "fa-solid fa-circle-xmark";
    iconEl.style.color = "#f44336";
  } else {
    toast.style.borderLeft = "4px solid #4caf50";
    iconEl.className = "fa-solid fa-circle-check";
    iconEl.style.color = "#4caf50";
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
};

window.handleBooking = async function (event) {
  event.preventDefault();
  const btn = event.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  const service = document.getElementById("book-service")?.value || "Belirtilmedi";
  const date = document.getElementById("book-date")?.value || "";
  const time = document.getElementById("book-time")?.value || "";
  const expert = document.getElementById("book-expert")?.value || "Farketmez";

  if (!date || !time) {
    showLocalToast("Lütfen tarih ve saat seçiniz.", true);
    return;
  }

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> İşleniyor...';
  btn.disabled = true;

  try {
    // Kullanıcı kontrolü
    let currentUser = "Misafir";
    let userId = null;
    try {
      const userObj = JSON.parse(localStorage.getItem("hk_auth_user"));
      if (userObj) {
        currentUser = userObj.name || userObj.email;
        userId = userObj.id || null;
      }
    } catch (e) { }

    let servicePrice = "0";
    try {
      const services = JSON.parse(localStorage.getItem("hk_services_db")) || [];
      const selectedServiceObj = services.find(s => s.name === service);
      if (selectedServiceObj) {
        servicePrice = selectedServiceObj.price;
      }
    } catch (e) { }

    // Supabase'e Kaydet
    const { data, error } = await supabase
      .from('appointments')
      .insert([
        {
          user_name: currentUser,
          user_id: userId,
          service: service,
          price: servicePrice,
          date: date,
          time: time,
          expert: expert,
          status: "pending"
        }
      ]);

    if (error) throw error;

    showLocalToast("Randevunuz başarıyla oluşturuldu. Yönlendiriliyorsunuz...");
    event.target.reset();

    setTimeout(() => {
      const appointmentsBtn = document.querySelector('button[onclick*="appointments"]');
      if (appointmentsBtn) {
        appointmentsBtn.click();
      } else {
        if (typeof loadUserAppointments === 'function') loadUserAppointments();
      }
    }, 1500);

  } catch (err) {
    console.error("Randevu kayit hatasi:", err);
    showLocalToast("Randevu oluşturulurken bir hata meydana geldi.", true);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

window.loadUserAppointments = async function () {
  const container = document.querySelector("#panel-appointments .appointment-list");
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

  let currentUser = "Misafir";
  let userId = null;
  try {
    const userObj = JSON.parse(localStorage.getItem("hk_auth_user"));
    if (userObj) {
      currentUser = userObj.name;
      userId = userObj.id;
    }
  } catch (e) { }

  try {
    let myAppointments = [];
    let query = supabase.from('appointments').select('*').order('created_at', { ascending: false });

    // Kullanıcı ID'si varsa ID'ye göre çek (RLS kuralları gereği kendi datasını alacak)
    // Yoksa da isim eşleşmesi yap (Misafir vs.)
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('user_name', currentUser);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (data) myAppointments = data;

    let completedCount = 0;
    let pendingCount = 0;

    myAppointments.forEach(app => {
      if (app.status === 'approved') completedCount++;
      if (app.status === 'pending') pendingCount++;
    });

    const loyaltyPtsStr = document.getElementById("user-loyalty-pts");
    const completedPtsStr = document.getElementById("user-completed-pts");
    const pendingPtsStr = document.getElementById("user-pending-pts");

    if (loyaltyPtsStr) loyaltyPtsStr.textContent = completedCount * 50;
    if (completedPtsStr) completedPtsStr.textContent = completedCount;
    if (pendingPtsStr) pendingPtsStr.textContent = pendingCount;

    const upcomingContainer = document.getElementById("user-upcoming-appointments");
    if (upcomingContainer) {
      if (myAppointments.length === 0) {
        upcomingContainer.innerHTML = '<div style="padding: 20px; text-align:center; color:#888;">Son randevunuz bulunmamaktadır.</div>';
      } else {
        const recentApps = myAppointments.slice(0, 2);
        upcomingContainer.innerHTML = recentApps.map(app => {
          const statusClass = app.status === 'approved' ? 'approved' : (app.status === 'rejected' ? 'rejected' : 'pending');
          const statusText = app.status === 'approved' ? 'Onaylandı' : (app.status === 'rejected' ? 'İptal Edildi' : 'Onay Bekleniyor');

          return `
                  <div class="appointment-row" style="background:#fdfcf0; border-color:#e6dfa8; margin-bottom:10px;">
                    <div class="app-details">
                      <h3>${app.service}</h3>
                      <p>
                        <span><i class="fa-regular fa-calendar"></i> ${app.date}</span>
                        <span><i class="fa-regular fa-clock"></i> ${app.time}</span>
                        <span><i class="fa-regular fa-user"></i> Uzman: ${app.expert}</span>
                      </p>
                    </div>
                    <div class="app-status">
                      <span class="badge ${statusClass}">${statusText}</span>
                      <button class="btn btn--outline btn--sm" onclick="showLocalToast('Randevu detayı mailinize gönderildi.')">Detay <i class="fa-solid fa-eye"></i></button>
                    </div>
                  </div>
                  `;
        }).join('');
      }
    }

    if (myAppointments.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 40px; color:#888;">Henüz randevunuz bulunmuyor.</div>';
      return;
    }

    container.innerHTML = myAppointments.map(app => {
      const statusClass = app.status === 'approved' ? 'approved' : (app.status === 'rejected' ? 'rejected' : 'pending');
      const statusText = app.status === 'approved' ? 'Onaylandı' : (app.status === 'rejected' ? 'İptal Edildi' : 'Onay Bekleniyor');

      return `
          <div class="appointment-row">
            <div class="app-details">
              <h3>${app.service}</h3>
              <p>
                <span><i class="fa-regular fa-calendar"></i> ${app.date}</span>
                <span><i class="fa-regular fa-clock"></i> ${app.time}</span>
                <span><i class="fa-regular fa-user"></i> ${app.expert}</span>
              </p>
            </div>
            <div class="app-status">
              <span class="badge ${statusClass}">${statusText}</span>
              ${app.status === 'pending' ? `<button class="btn btn--outline btn--sm" onclick="cancelAppointment('${app.id}')">İptal <i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>
          </div>
        `;
    }).join('');

  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="text-align:center; padding: 40px; color:#f44336;">Randevular yüklenirken bir hata oluştu.</div>';
  }
};

window.cancelAppointment = async function (id) {
  if (!confirm("Randevuyu iptal etmek istediğinize emin misiniz?")) return;
  // Supabase'den sil (veya statüyü rejected yap)
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;

    showLocalToast("Randevu iptal edildi.", true);
    loadUserAppointments();
  } catch (err) {
    console.error(err);
    showLocalToast("İptal işlemi başarısız.", true);
  }
};

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.querySelector(".lightbox-close");
const galleryItems = document.querySelectorAll(".gallery-item");

if (lightbox && lightboxImg && galleryItems.length > 0) {
  galleryItems.forEach(item => {
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      if (img) {
        lightbox.style.display = "flex";

        let highResSrc = img.src.replace('&w=800', '&w=1600');
        lightboxImg.src = highResSrc;

        setTimeout(() => {
          lightbox.classList.add("show");
        }, 10);
      }
    });
  });

  const closeLightbox = () => {
    lightbox.classList.remove("show");
    setTimeout(() => {
      lightbox.style.display = "none";
    }, 300);
  };

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("show")) {
      closeLightbox();
    }
  });
}

window.handleRegister = function (event) {
  event.preventDefault();

  const fname = document.getElementById("fname")?.value.trim() || "";
  const lname = document.getElementById("lname")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
  const password = document.getElementById("password")?.value || "";

  if (!fname || !email || !password) return;

  const btn = event.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> İşleniyor...';
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.disabled = false;

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem("hk_users_db")) || [];
    } catch (e) { }

    const exists = users.find(u => u.email === email);
    if (exists) {
      showLocalToast("Bu e-posta adresi zaten kayıtlı.", true);
      return;
    }

    const newUser = {
      fname,
      lname,
      email,
      password,
      role: "user"
    };

    users.push(newUser);
    localStorage.setItem("hk_users_db", JSON.stringify(users));

    showLocalToast("Kayıt işleminiz başarıyla tamamlandı, yönlendiriliyorsunuz...");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
  }, 800);
};

window.handleLogin = function (event) {
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

  if (rememberCheckbox && rememberCheckbox.checked) {
    localStorage.setItem("hk_remember_user", JSON.stringify({ email, password }));
  } else {
    localStorage.removeItem("hk_remember_user");
  }

  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.disabled = false;

    if (email === "admin@hamdibeauty.com" || email === "admin@example.com") {
      if (password !== "admin123" && password !== "admin") {
        showLocalToast("Hatalı yönetici şifresi.", true);
        return;
      }
      localStorage.setItem("hk_auth_user", JSON.stringify({
        name: "Yönetici",
        role: "admin",
        email: email
      }));
      window.location.href = "admin.html";
      return;
    }

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem("hk_users_db")) || [];
    } catch (e) { }

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      localStorage.setItem("hk_auth_user", JSON.stringify({
        name: user.fname + " " + user.lname,
        role: user.role,
        email: user.email
      }));
      window.location.href = "index.html";
    } else {
      showLocalToast("Hatalı e-posta veya şifre girdiniz.", true);
    }
  }, 800);
};

window.logout = function () {
  localStorage.removeItem("hk_auth_user");
  window.location.href = "login.html";
};

window.loadUserData = function () {
  const userJson = localStorage.getItem("hk_auth_user");
  const userNameElements = document.querySelectorAll(".dynamic-user-name");
  let defaultName = "Misafir";

  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.name) {
        userNameElements.forEach(el => {
          el.textContent = user.name;
        });
      }
    } catch (e) {
      console.error("Error parsing user data", e);
    }
  } else {
    userNameElements.forEach(el => {
      el.textContent = defaultName;
    });
  }
};

window.checkAuthState = function () {
  const userJson = localStorage.getItem("hk_auth_user");
  const path = window.location.pathname.toLowerCase();
  const isAuthPage = path.includes("login.html") || path.includes("register.html");

  if (!userJson && !isAuthPage) {
    window.location.href = "login.html";
    return;
  }

  if (userJson && isAuthPage) {
    try {
      const user = JSON.parse(userJson);
      window.location.href = user.role === "admin" ? "admin.html" : "index.html";
      return;
    } catch (e) { }
  }

  const loginBtn = document.getElementById("nav-login-btn");
  if (!loginBtn) return; // Not on a page with navbar login btn

  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.role) {

        loginBtn.innerHTML = '<i class="fa-regular fa-user"></i> Panele Git';
        loginBtn.href = user.role === "admin" ? "admin.html" : "kullanici.html";
        loginBtn.classList.remove("btn--outline");
        loginBtn.classList.add("btn--primary");
        loginBtn.style.background = "#333";
        loginBtn.style.color = "#fff";
        loginBtn.style.borderColor = "#333";

        const bookBtn = document.getElementById("nav-book-btn");
        if (bookBtn && user.role === "admin") {
          bookBtn.style.display = "none";
        }
      }
    } catch (e) { }
  }
};

window.handleContactForm = async function (event) {
  event.preventDefault();
  const nameInput = document.getElementById("c-name");
  const emailInput = document.getElementById("c-email");
  const msgInput = document.getElementById("c-msg");
  const btn = event.target.querySelector('button[type="submit"]');

  if (!nameInput || !emailInput || !msgInput) return;

  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gönderiliyor...';
  btn.disabled = true;

  try {
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          message: msgInput.value.trim()
        }
      ]);

    if (error) throw error;

    showLocalToast('Mesajınız başarıyla iletildi. En kısa sürede dönüş sağlanacaktır.');
    event.target.reset();

    if (typeof loadAdminNotifications === 'function') {
      window.loadAdminNotifications();
    }
  } catch (err) {
    console.error(err);
    showLocalToast('Mesaj gönderilirken hata oluştu.', true);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

window.toggleAdminNotifications = function () {
  const dropdown = document.getElementById("admin-notif-dropdown");
  if (dropdown) {
    if (dropdown.style.display === "none") {
      dropdown.style.display = "block";
      loadAdminNotifications();
    } else {
      dropdown.style.display = "none";
    }
  }
};

window.loadAdminNotifications = async function () {
  const countSpan = document.getElementById("admin-notif-count");
  const listDiv = document.getElementById("admin-notif-list");

  if (!countSpan || !listDiv) return;

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const safeMessages = messages || [];
    const unreadCount = safeMessages.filter(m => !m.is_read).length;
    countSpan.textContent = unreadCount;

    if (unreadCount > 0) {
      countSpan.style.color = "#fff";
      countSpan.style.background = "#f44336";
      countSpan.style.padding = "2px 6px";
      countSpan.style.borderRadius = "50%";
      countSpan.style.fontSize = "0.75rem";
    } else {
      countSpan.style.background = "transparent";
      countSpan.style.color = "inherit";
      countSpan.style.padding = "0";
    }

    if (safeMessages.length === 0) {
      listDiv.innerHTML = "<div style='text-align:center; color:#888; padding:20px;'>Henüz mesaj yok.</div>";
      return;
    }

    listDiv.innerHTML = safeMessages.map(m => {
      const bg = m.is_read ? "transparent" : "#fffcf2";
      const dateStr = new Date(m.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      return `
          <div style="padding:15px; border-bottom:1px solid #eee; background:${bg};">
            <div style="font-weight:600; font-size:0.9rem; margin-bottom:4px;">${m.name} <span style="font-weight:400; font-size:0.75rem; color:#888; float:right;">${dateStr}</span></div>
            <div style="font-size:0.8rem; color:#666; margin-bottom:6px;"><i class="fa-regular fa-envelope"></i> <a href="mailto:${m.email}" style="color:#d4af37; text-decoration:none;">${m.email}</a></div>
            <div style="font-size:0.85rem; line-height:1.4;">${m.message}</div>
          </div>
          `;
    }).join('');

  } catch (err) {
    console.error(err);
    listDiv.innerHTML = "<div style='text-align:center; color:#f44336; padding:20px;'>Bildirimler yüklenemedi.</div>";
  }
};

window.markAllMessagesRead = async function () {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) throw error;

    loadAdminNotifications();
    showLocalToast('Tüm mesajlar okundu olarak işaretlendi.');
  } catch (err) {
    console.error(err);
    showLocalToast('Bir hata oluştu.', true);
  }
};

document.addEventListener("DOMContentLoaded", () => {

  window.checkAuthState();

  if (document.querySelector(".page--dashboard")) {
    window.loadUserData();
    if (typeof loadUserAppointments === 'function') loadUserAppointments();

    if (document.querySelector(".page--admin") || document.querySelector("body").innerHTML.includes("panel-dashboard")) {

      initDefaultServices();

      if (typeof loadAdminAppointments === 'function') window.loadAdminAppointments();
      if (typeof loadAdminCustomers === 'function') window.loadAdminCustomers();
      if (typeof loadAdminNotifications === 'function') window.loadAdminNotifications();
      if (typeof loadAdminServices === 'function') {
        setTimeout(() => { window.loadAdminServices(); }, 100); // Give localStorage a tiny moment 
      }
    }
  }

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const rememberCheckbox = document.getElementById("rememberMe");

  if (emailInput && passwordInput && rememberCheckbox) {
    const rememberedUser = localStorage.getItem("hk_remember_user");
    if (rememberedUser) {
      try {
        const parsed = JSON.parse(rememberedUser);
        if (parsed.email && parsed.password) {
          emailInput.value = parsed.email;
          passwordInput.value = parsed.password;
          rememberCheckbox.checked = true;
        }
      } catch (e) { }
    }
  }
});

window.loadAdminAppointments = async function () {
  const container = document.getElementById("admin-appointments-list");
  const containerAll = document.getElementById("all-appointments-list");

  if (!container && !containerAll) return;

  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const safeApps = appointments || [];
    const pendingApps = safeApps.filter(a => a.status === 'pending');
    const pendingCount = pendingApps.length;
    let expectedRevenue = 0;

    pendingApps.forEach(app => {
      if (app.price) {
        expectedRevenue += parseInt(app.price.replace(/\D/g, '') || "0");
      }
    });

    const revenueEl = document.getElementById("admin-daily-revenue");
    const dailyAppsEl = document.getElementById("admin-daily-appointments");

    if (revenueEl) revenueEl.textContent = expectedRevenue.toLocaleString('tr-TR');
    if (dailyAppsEl) dailyAppsEl.textContent = pendingCount;

    const statInfoEl = document.querySelectorAll('.stat-card__info');
    statInfoEl.forEach(el => {
      const titleEl = el.querySelector('h4');
      if (titleEl && titleEl.textContent.includes('Onay Bekleyen')) {
        const valEl = el.querySelector('p');
        if (valEl) valEl.textContent = pendingCount;
      }
    });

    if (safeApps.length === 0) {
      const emptyRow = '<tr><td colspan="5" style="text-align:center; padding: 30px;">Henüz randevu talebi yok.</td></tr>';
      if (container) container.innerHTML = emptyRow;
      if (containerAll) containerAll.innerHTML = emptyRow;
      return;
    }

    const generatedHtml = safeApps.map((app, index) => {
      const statusText = app.status === 'approved' ? '<span class="badge approved">Onaylandı</span>' :
        (app.status === 'rejected' ? '<span class="badge rejected">Reddedildi</span>' : '<span class="badge pending">Bekliyor</span>');

      const actions = app.status === 'pending' ? `
          <button class="btn btn--sm" style="background:#4caf50; color:#fff; border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-size:0.8rem;" onclick="updateAppointmentStatus('${app.id}', 'approved')"><i class="fa-solid fa-check"></i> Onayla</button>
          <button class="btn btn--sm" style="background:#f44336; color:#fff; border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-size:0.8rem;" onclick="updateAppointmentStatus('${app.id}', 'rejected')"><i class="fa-solid fa-times"></i> Reddet</button>
        ` : `<span style="font-size:0.85rem; color:#888;">İşlem Yapıldı</span>`;

      return `
          <tr>
            <td><strong>${app.user_name}</strong><br><span style="font-size:0.85rem; color:#666;">${app.service} (${app.expert})</span></td>
            <td>${app.date}</td>
            <td>${app.time}</td>
            <td>${statusText}</td>
            <td style="display:flex; gap:8px;">${actions}</td>
          </tr>
        `;
    }).join('');

    if (container) container.innerHTML = generatedHtml;
    if (containerAll) containerAll.innerHTML = generatedHtml;

  } catch (err) {
    console.error(err);
    if (container) container.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Veriler yüklenirken hata oluştu!</td></tr>';
  }
};

window.updateAppointmentStatus = async function (id, newStatus) {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) throw error;

    loadAdminAppointments();
    if (newStatus === 'approved') {
      showLocalToast('Randevu onaylandı.');
    } else {
      showLocalToast('Randevu reddedildi.', true);
    }
  } catch (err) {
    console.error(err);
    showLocalToast('Durum güncellenirken bir hata oluştu.', true);
  }
};

window.loadAdminCustomers = function () {
  const container = document.getElementById("admin-customers-list");
  if (!container) return;

  let users = [];
  try {
    users = JSON.parse(localStorage.getItem("hk_users_db")) || [];
  } catch (e) { }

  let customers = users.filter(u => u.role === "user");

  const hasHalil = customers.some(u => (u.fname?.toLowerCase() || '') === 'halil' && (u.lname?.toLowerCase() || '') === 'cambaz');
  if (!hasHalil) {
    customers.push({
      fname: 'Halil',
      lname: 'Cambaz',
      email: 'halil.cambaz@example.com',
      role: 'user'
    });
  }

  if (customers.length === 0) {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Henüz sisteme kayıtlı müşteri bulunmuyor.</div>';
    return;
  }

  container.innerHTML = customers.map((user, index) => {

    const badgeType = (index % 3 === 0) ? '<span class="badge" style="background:#e3f2fd; color:#1565c0;">VIP</span>'
      : '<span class="badge" style="background:#f5f5f5; color:#616161;">Standart</span>';

    const phoneNum = "0555 " + Math.floor(100 + Math.random() * 900) + " " + Math.floor(1000 + Math.random() * 9000);

    return `
      <div class="appointment-row">
        <div class="app-details">
          <h3>${user.fname} ${user.lname}</h3>
          <p>
            <span><i class="fa-regular fa-envelope"></i> ${user.email}</span>
            <span><i class="fa-solid fa-phone"></i> ${phoneNum}</span>
          </p>
        </div>
        <div class="app-status">
          ${badgeType}
          <button class="btn btn--outline btn--sm" onclick="showLocalToast('Müşteri detayı henüz aktif değil.')"><i class="fa-solid fa-pen"></i> Düzenle</button>
        </div>
      </div>
    `;
  }).join('');
};

window.initDefaultServices = function () {
  const defaultServices = [
    { id: "S1", name: "Saç Kesimi & Tasarım", price: "850", duration: "45", category: "Saç" },
    { id: "S2", name: "Ombre / Sombre / Balyaj", price: "3500", duration: "180", category: "Saç" },
    { id: "S3", name: "Keratin Bakımı", price: "2200", duration: "120", category: "Saç" },
    { id: "S4", name: "Gelin Saçı Tasarımı", price: "4000", duration: "150", category: "Saç" },
    { id: "S5", name: "Klasik Medikal Cilt Bakımı", price: "1200", duration: "60", category: "Cilt Bakımı" },
    { id: "S6", name: "Altın İğne Radyofrekans", price: "4500", duration: "60", category: "Cilt Bakımı" },
    { id: "S7", name: "Dermapen 4 Microneedling", price: "2800", duration: "45", category: "Cilt Bakımı" },
    { id: "S8", name: "HydraFacial MD Özellikli Bakım", price: "1800", duration: "90", category: "Cilt Bakımı" },
    { id: "S9", name: "Medikal Manikür & Kalıcı Oje", price: "650", duration: "45", category: "Tırnak" },
    { id: "S10", name: "Jel Protez Tırnak", price: "1100", duration: "90", category: "Tırnak" },
    { id: "S11", name: "Medikal Pedikür", price: "800", duration: "60", category: "Tırnak" },
    { id: "S12", name: "Gece Makyajı / V.I.P", price: "1500", duration: "60", category: "Makyaj" },
    { id: "S13", name: "İpek Kirpik (Volume)", price: "1300", duration: "90", category: "Makyaj" },
    { id: "S14", name: "Microblading Kaş Tasarımı", price: "3500", duration: "120", category: "Makyaj" }
  ];

  if (!localStorage.getItem("hk_services_db")) {
    localStorage.setItem("hk_services_db", JSON.stringify(defaultServices));
  }
};

window.loadAdminServices = function () {
  const container = document.querySelector("#panel-services .appointment-list");
  if (!container) return;

  let servicesStr = localStorage.getItem("hk_services_db");
  if (!servicesStr || servicesStr === "[]") {
    initDefaultServices();
    servicesStr = localStorage.getItem("hk_services_db");
  }

  let services = [];
  try {
    services = JSON.parse(servicesStr) || [];
  } catch (e) {
    console.error("Hizmet verisi okunamadı JSON Error:", e);
  }


  container.innerHTML = services.map(srv => {
    return `
      <div class="appointment-row" id="service-row-${srv.id}">
        <div class="app-details">
          <h3 id="srv-name-${srv.id}">${srv.name} <span style="font-size:0.8rem; font-weight:normal; color:#888;">(${srv.category})</span></h3>
          <p>
            <span><i class="fa-solid fa-tag"></i> ₺<span id="srv-price-${srv.id}">${srv.price}</span></span>
            <span><i class="fa-regular fa-clock"></i> <span id="srv-duration-${srv.id}">${srv.duration}</span> DK</span>
          </p>
        </div>
        <div class="app-status">
          <button class="btn btn--outline btn--sm" onclick="editService('${srv.id}')"><i class="fa-solid fa-pen"></i> Düzenle</button>
        </div>
      </div>
    `;
  }).join('');
};

window.editService = function (id) {
  let services = [];
  try {
    services = JSON.parse(localStorage.getItem("hk_services_db")) || [];
  } catch (e) { }

  const srv = services.find(s => s.id === id);
  if (!srv) return;

  const newPrice = prompt(`"${srv.name}" için yeni fiyatı giriniz (Sadece rakam):`, srv.price);
  if (newPrice === null) return; // cancelled

  const newDuration = prompt(`"${srv.name}" için yeni işlem süresini giriniz (Dakika cinsinden):`, srv.duration);
  if (newDuration === null) return; // cancelled

  if (isNaN(newPrice) || isNaN(newDuration) || newPrice.trim() === "" || newDuration.trim() === "") {
    showLocalToast("Geçersiz değer girildi. Lütfen sadece sayısal değerler kullanın.", true);
    return;
  }

  srv.price = newPrice.trim();
  srv.duration = newDuration.trim();

  localStorage.setItem("hk_services_db", JSON.stringify(services));
  loadAdminServices(); // refresh UI
  showLocalToast("Hizmet güncellendi.");
};

window.loadIndexServices = function () {
  const container = document.getElementById("index-services-list");
  if (!container) return;

  let servicesStr = localStorage.getItem("hk_services_db");
  if (!servicesStr || servicesStr === "[]") {
    if (typeof initDefaultServices === "function") initDefaultServices();
    servicesStr = localStorage.getItem("hk_services_db");
  }

  let services = [];
  try {
    services = JSON.parse(servicesStr) || [];
  } catch (e) { }

  const categoriesMap = {
    "Saç": { title: "Hair Design / Saç", descHtml: function (s) { return `<span class="service-item__desc">${s.duration} DK. Özel Tasarım</span>`; }, delay: 0 },
    "Cilt Bakımı": { title: "Skin Care / Cilt Bakımı", descHtml: function (s) { return `<span class="service-item__desc">Kişiye Özel Protokol / ${s.duration} DK</span>`; }, delay: 1 },
    "Tırnak": { title: "Nail Art / Tırnak", descHtml: function (s) { return `<span class="service-item__desc">Medikal ve Estetik / ${s.duration} DK</span>`; }, delay: 0 },
    "Makyaj": { title: "Makeup / Makyaj", descHtml: function (s) { return `<span class="service-item__desc">Profesyonel / ${s.duration} DK</span>`; }, delay: 1 }
  };

  const categorized = {
    "Saç": [], "Cilt Bakımı": [], "Tırnak": [], "Makyaj": []
  };

  services.forEach(s => {
    if (categorized[s.category]) {
      categorized[s.category].push(s);
    }
  });

  let htmlResult = "";

  for (const catName in categorized) {
    const catServices = categorized[catName];
    if (catServices.length === 0) continue;

    const meta = categoriesMap[catName];
    const delayClass = meta.delay > 0 ? `reveal-delay-${meta.delay}` : '';

    let catHtml = `
      <div class="service-category reveal ${delayClass}">
        <h3 class="service-category__title">${meta.title}</h3>
     `;

    catServices.forEach(s => {
      catHtml += `
        <div class="service-item">
          <div class="service-item__name">${s.name} ${meta.descHtml(s)}</div>
          <div class="service-item__price">₺${s.price}</div>
        </div>
       `;
    });

    catHtml += `</div>`; // close service-category
    htmlResult += catHtml;
  }

  container.innerHTML = htmlResult;

  if ('IntersectionObserver' in window) {
    const newReveals = container.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

    newReveals.forEach(el => observer.observe(el));
  } else {
    container.querySelectorAll(".reveal").forEach(el => el.classList.add('reveal--visible'));
  }
};
/* Supabase Configuration */
const supabaseUrl = 'https://lqkjhgoknelnonxwvuey.supabase.co';
const supabaseKey = 'sb_publishable_PXEKhSNgAQGYpPDJ8A5KOw_KusAvfOO';
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

            window.location.href = role === "admin" ? "admin.html" : "index.html";
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
    const userJson = localStorage.getItem("hk_auth_user");
    const path = window.location.pathname.toLowerCase();
    const isAuthPage = path.includes("login.html") || path.includes("register.html");

    // Supabase session'ı kontrol edelim (Gerçek doğrulama)
    try {
        const { data: { session } } = await supabase.auth.getSession();

        // Eğer supabase session varsa ve localde yoksa senkronize et (veya tam tersi)
        if (session && !userJson) {
            const user = session.user;
            localStorage.setItem("hk_auth_user", JSON.stringify({
                name: (user.user_metadata?.first_name + " " + user.user_metadata?.last_name).trim() || "Kullanıcı",
                role: user.user_metadata?.role || 'user',
                email: user.email,
                id: user.id
            }));
        } else if (!session && userJson) {
            // Sadece admin hesabı değilse local session'ı sil (Admin hesabı supabase'de olmayabilir)
            const localUser = JSON.parse(userJson);
            if (localUser.role !== 'admin') {
                localStorage.removeItem("hk_auth_user");
            }
        }
    } catch (e) { }

    const updatedUserJson = localStorage.getItem("hk_auth_user");

    // Korunan sayfa kontrolü
    if (!updatedUserJson && (path.includes("kullanici.html") || path.includes("admin.html") || path.includes("dashboard.html"))) {
        window.location.href = "login.html";
        return;
    }

    if (updatedUserJson && isAuthPage) {
        try {
            const user = JSON.parse(updatedUserJson);
            window.location.href = user.role === "admin" ? "admin.html" : "index.html";
            return;
        } catch (e) { }
    }

    // Navbar Butonlarını Güncelle
    const loginBtn = document.getElementById("nav-login-btn");
    if (!loginBtn) return;

    if (updatedUserJson) {
        try {
            const user = JSON.parse(updatedUserJson);
            if (user && user.role) {
                loginBtn.innerHTML = '<i class="fa-regular fa-user"></i> Panele Git';
                loginBtn.href = user.role === "admin" ? "admin.html" : "kullanici.html";
                loginBtn.classList.remove("btn--outline");
                loginBtn.classList.add("btn--primary");
                loginBtn.style.background = "#333";
                loginBtn.style.color = "#fff";
                loginBtn.style.borderColor = "#333";

                const bookBtn = document.getElementById("nav-book-btn");
                if (bookBtn && user.role === "admin") {
                    bookBtn.style.display = "none";
                }
            }
        } catch (e) { }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.checkAuthState();
});


