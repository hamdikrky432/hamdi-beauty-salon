

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
        let n = userObj.name || "";
        if (n.includes("undefined") || n.trim() === "") n = (userObj.fname && userObj.lname ? userObj.fname + " " + userObj.lname : "");
        currentUser = n || userObj.email || "Kullanıcı";
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
    const { data, error } = await window.supabaseClient
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

    if (error) {
      console.warn("Supabase randevu hatası:", error.message);
      
      // Fallback: Save locally
      let localAppointments = [];
      try { localAppointments = JSON.parse(localStorage.getItem("hk_appointments_db")) || []; } catch(e) {}
      
      localAppointments.push({
        id: "local-" + Date.now(),
        user_name: currentUser,
        user_id: userId,
        service: service,
        price: servicePrice,
        date: date,
        time: time,
        expert: expert,
        status: "pending",
        created_at: new Date().toISOString()
      });
      localStorage.setItem("hk_appointments_db", JSON.stringify(localAppointments));
    }

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
    
    // Fallback if completely broken
    let localAppointments = [];
    try { localAppointments = JSON.parse(localStorage.getItem("hk_appointments_db")) || []; } catch(e) {}
    
    // Retrieve values even if variables throw
    let fbUser = "Misafir";
    try {
      const uObj = JSON.parse(localStorage.getItem("hk_auth_user"));
      if (uObj) {
          let n = uObj.name || "";
          if (n.includes("undefined") || n.trim() === "") n = (uObj.fname && uObj.lname ? uObj.fname + " " + uObj.lname : "");
          fbUser = n || uObj.email || "Kullanıcı";
      }
    } catch(e) {}

    localAppointments.push({
      id: "local-" + Date.now(),
      user_name: fbUser,
      user_id: "local-" + Date.now(),
      service: document.getElementById("book-service")?.value || "Belirtilmedi",
      price: document.getElementById("book-service") ? (document.getElementById("book-service").options[document.getElementById("book-service").selectedIndex]?.dataset?.price || "0") : "0",
      date: document.getElementById("book-date")?.value || "-",
      time: document.getElementById("book-time")?.value || "-",
      expert: document.getElementById("book-expert")?.value || "Farketmez",
      status: "pending",
      created_at: new Date().toISOString()
    });
    localStorage.setItem("hk_appointments_db", JSON.stringify(localAppointments));
    
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
    let query = window.supabaseClient.from('appointments').select('*').not('status', 'in', '("message","registered")').order('created_at', { ascending: false });

    // Kullanıcı ID'si varsa ID'ye göre çek (RLS kuralları gereği kendi datasını alacak)
    // Yoksa da isim eşleşmesi yap (Misafir vs.)
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('user_name', currentUser);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Supabase Fetch Hatası:", error.message);
    }
    
    if (data) myAppointments = data;

    // Fallback: Merge with local appointments
    try {
      const localAppointments = JSON.parse(localStorage.getItem("hk_appointments_db")) || [];
      const userLocalAppointments = localAppointments.filter(app => {
        if (userId && app.user_id === userId) return true;
        if (app.user_name === currentUser) return true;
        return false;
      });
      myAppointments = [...myAppointments, ...userLocalAppointments];
      myAppointments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch(e) {}

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
                      <h3>${app.service || "Hizmet Yok"}</h3>
                      <p>
                        <span><i class="fa-regular fa-calendar"></i> ${app.date || "-"}</span>
                        <span><i class="fa-regular fa-clock"></i> ${app.time || "-"}</span>
                        <span><i class="fa-regular fa-user"></i> Uzman: ${app.expert || "Farketmez"}</span>
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
              <h3>${app.service || "Hizmet Yok"}</h3>
              <p>
                <span><i class="fa-regular fa-calendar"></i> ${app.date || "-"}</span>
                <span><i class="fa-regular fa-clock"></i> ${app.time || "-"}</span>
                <span><i class="fa-regular fa-user"></i> ${app.expert || "Farketmez"}</span>
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
  
  if (String(id).startsWith("local-") || !isNaN(id)) {
    try {
      let localAppointments = JSON.parse(localStorage.getItem("hk_appointments_db")) || [];
      const index = localAppointments.findIndex(app => String(app.id) === String(id));
      if (index !== -1) {
        localAppointments[index].status = 'rejected';
        localStorage.setItem("hk_appointments_db", JSON.stringify(localAppointments));
        showLocalToast("Randevu iptal edildi.", true);
        loadUserAppointments();
        return;
      }
    } catch(e) {
      console.warn("Local storage cancel error:", e);
    }
  }

  // Supabase'den sil (veya statüyü rejected yap)
  try {
    const { error } = await window.supabaseClient
      .from('appointments')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
       console.warn("Supabase cancel hatası:", error.message);
    } else {
       showLocalToast("Randevu iptal edildi.", true);
    }

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
    const { error } = await window.supabaseClient
      .from('appointments')
      .insert([
        {
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          message: msgInput.value.trim(),
          status: 'message'
        }
      ]);

    if (error) {
      console.warn("Supabase mesaj hatası:", error.message);
      // Fallback: Save to local storage
      let localMessages = [];
      try { localMessages = JSON.parse(localStorage.getItem("hk_messages_db")) || []; } catch (e) { }
      localMessages.push({
        id: "local-" + Date.now(),
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        message: msgInput.value.trim(),
        created_at: new Date().toISOString(),
        is_read: false
      });
      localStorage.setItem("hk_messages_db", JSON.stringify(localMessages));
    }

    showLocalToast('Mesajınız başarıyla iletildi. En kısa sürede dönüş sağlanacaktır.');
    event.target.reset();

    if (typeof loadAdminNotifications === 'function') {
      window.loadAdminNotifications();
    }
  } catch (err) {
    console.error(err);
    
    // Fallback if client is completely broken
    let localMessages = [];
    try { localMessages = JSON.parse(localStorage.getItem("hk_messages_db")) || []; } catch (e) { }
    localMessages.push({
      id: "local-" + Date.now(),
      name: document.getElementById("c-name")?.value.trim() || "Ziyaretçi",
      email: document.getElementById("c-email")?.value.trim() || "Girilmedi",
      message: document.getElementById("c-msg")?.value.trim() || "Boş Mesaj",
      created_at: new Date().toISOString(),
      is_read: false
    });
    localStorage.setItem("hk_messages_db", JSON.stringify(localMessages));
    
    showLocalToast('Mesajınız başarıyla iletildi. En kısa sürede dönüş sağlanacaktır.');
    event.target.reset();
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
    const { data: messages, error } = await window.supabaseClient
      .from('appointments')
      .select('*')
      .eq('status', 'message')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Supabase messages hatası:", error.message);
    }

    let safeMessages = messages || [];
    
    // Add local fallback messages
    try {
      const localMessages = JSON.parse(localStorage.getItem("hk_messages_db")) || [];
      safeMessages = [...safeMessages, ...localMessages];
      
      // Sort combined messages by date descending
      safeMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (e) {
      console.error("Local messages error:", e);
    }

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
      const messagesTable = document.getElementById("admin-messages-list");
      if(messagesTable) messagesTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px;">Henüz mesaj yok.</td></tr>';
      return;
    }

    listDiv.innerHTML = safeMessages.map(m => {
      const bg = m.is_read ? "transparent" : "#fffcf2";
      const dateStr = new Date(m.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      let mEmail = m.email || "Belirtilmedi";
      let mName = m.name || "İsimsiz";
      return `
          <div style="padding:15px; border-bottom:1px solid #eee; background:${bg};">
            <div style="font-weight:600; font-size:0.9rem; margin-bottom:4px;">${mName} <span style="font-weight:400; font-size:0.75rem; color:#888; float:right;">${dateStr}</span></div>
            <div style="font-size:0.8rem; color:#666; margin-bottom:6px;"><i class="fa-regular fa-envelope"></i> <a href="mailto:${mEmail}" style="color:#d4af37; text-decoration:none;">${mEmail}</a></div>
            <div style="font-size:0.85rem; line-height:1.4;">${m.message}</div>
          </div>
          `;
    }).join('');

    const messagesTable = document.getElementById("admin-messages-list");
    if (messagesTable) {
        messagesTable.innerHTML = safeMessages.map(m => {
            const dateStr = new Date(m.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
            const statusBadge = m.is_read ? '<span class="badge approved">Okundu</span>' : '<span class="badge pending">Okunmadı</span>';
            const actionBtn = m.is_read ? '' : `<button class="btn btn--sm" style="background:#4caf50; color:#fff; border:none; border-radius:4px; margin-right:4px; padding:6px 12px; cursor:pointer;" onclick="markSingleMessageRead('${m.id}')"><i class="fa-solid fa-check"></i> Okundu</button>`;
            
            let mEmail = m.email || "Belirtilmedi";
            let mName = m.name || "İsimsiz";
            
            return `
            <tr style="background: ${m.is_read ? 'transparent' : '#fffcf2'}; border-bottom:1px solid #eee;">
                <td style="padding:15px 20px;"><strong>${mName}</strong><br><a href="mailto:${mEmail}" style="color:var(--color-primary); font-size:0.85rem;">${mEmail}</a></td>
                <td style="padding:15px 20px;">${dateStr}</td>
                <td style="padding:15px 20px; max-width:300px; word-wrap:break-word;">${m.message}</td>
                <td style="padding:15px 20px;">${statusBadge}</td>
                <td style="padding:15px 20px;">${actionBtn}<button class="btn btn--sm" style="background:#f44336; color:#fff; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;" onclick="deleteMessage('${m.id}')"><i class="fa-solid fa-trash"></i> Sil</button></td>
            </tr>
            `;
        }).join('');
    }

  } catch (err) {
    console.error(err);
    listDiv.innerHTML = "<div style='text-align:center; color:#f44336; padding:20px;'>Bildirimler yüklenemedi.</div>";
  }
};

window.markSingleMessageRead = async function(id) {
    if (String(id).startsWith("local-")) {
        try {
            const localMessages = JSON.parse(localStorage.getItem("hk_messages_db")) || [];
            const idx = localMessages.findIndex(m => String(m.id) === String(id));
            if (idx !== -1) {
                localMessages[idx].is_read = true;
                localStorage.setItem("hk_messages_db", JSON.stringify(localMessages));
            }
        } catch(e) {}
    } else {
        await window.supabaseClient.from('appointments').update({ is_read: true }).eq('id', id);
    }
    loadAdminNotifications();
};

window.deleteMessage = async function(id) {
    if(!confirm("Mesajı silmek istediğinize emin misiniz?")) return;
    if (String(id).startsWith("local-")) {
        try {
            let localMessages = JSON.parse(localStorage.getItem("hk_messages_db")) || [];
            localMessages = localMessages.filter(m => String(m.id) !== String(id));
            localStorage.setItem("hk_messages_db", JSON.stringify(localMessages));
        } catch(e) {}
    } else {
        await window.supabaseClient.from('appointments').delete().eq('id', id);
    }
    showLocalToast("Mesaj silindi.");
    loadAdminNotifications();
};

window.markAllMessagesRead = async function () {
  try {
    const { error } = await window.supabaseClient
      .from('appointments')
      .update({ is_read: true })
      .eq('status', 'message')
      .eq('is_read', false);

    if (error) {
       console.warn("Supabase messages hatası:", error.message);
    }
    
    // Fallback: Mark local messages as read
    try {
      const localMessages = JSON.parse(localStorage.getItem("hk_messages_db")) || [];
      localMessages.forEach(m => m.is_read = true);
      localStorage.setItem("hk_messages_db", JSON.stringify(localMessages));
    } catch (e) { }

    loadAdminNotifications();
    showLocalToast('Tüm mesajlar okundu olarak işaretlendi.');
  } catch (err) {
    console.error(err);
    showLocalToast('Bir hata oluştu.', true);
  }
};

document.addEventListener("DOMContentLoaded", () => {


  if (document.querySelector(".page--dashboard")) {
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
    const { data: appointments, error } = await window.supabaseClient
      .from('appointments')
      .select('*')
      .not('status', 'in', '("message","registered")')
      .order('created_at', { ascending: false });

    if (error) {
       console.warn("Supabase Admin Fetch Hatası:", error.message);
    }

    let safeApps = appointments || [];

    // Add local fallback appointments
    try {
      const localAppointments = JSON.parse(localStorage.getItem("hk_appointments_db")) || [];
      safeApps = [...safeApps, ...localAppointments];
      safeApps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch(e) {}

    const pendingApps = safeApps.filter(a => a.status === 'pending');
    const pendingCount = pendingApps.length;
    let expectedRevenue = 0;

    const approvedApps = safeApps.filter(a => a.status === 'approved');
    approvedApps.forEach(app => {
      let val = 0;
      if (typeof app.price === 'number') {
        val = app.price;
      } else if (typeof app.price === 'string') {
        val = parseInt(app.price.replace(/\D/g, ''), 10);
      }
      if (!isNaN(val)) expectedRevenue += val;
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
          <button class="btn btn--sm" style="background:#6c757d; color:#fff; border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-size:0.8rem;" onclick="deleteAdminAppointment('${app.id}')"><i class="fa-solid fa-trash"></i> Sil</button>
        ` : `<span style="font-size:0.85rem; color:#888;">İşlem Yapıldı</span>
             <button class="btn btn--sm" style="background:#f44336; color:#fff; border:none; border-radius:4px; margin-left:8px; padding:6px 12px; cursor:pointer; font-size:0.8rem;" onclick="deleteAdminAppointment('${app.id}')"><i class="fa-solid fa-trash"></i> Sil</button>
            `;

      return `
          <tr>
            <td><strong>${app.user_name || "Misafir"}</strong><br><span style="font-size:0.85rem; color:#666;">${app.service || "Hizmet Yok"} (${app.expert || "Farketmez"})</span></td>
            <td>${app.date || "-"}</td>
            <td>${app.time || "-"}</td>
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
  if (String(id).startsWith("local-")) {
    try {
      let localAppointments = JSON.parse(localStorage.getItem("hk_appointments_db")) || [];
      const index = localAppointments.findIndex(app => String(app.id) === String(id));
      if (index !== -1) {
        localAppointments[index].status = newStatus;
        localStorage.setItem("hk_appointments_db", JSON.stringify(localAppointments));
        
        loadAdminAppointments();
        if (newStatus === 'approved') {
          showLocalToast('Randevu onaylandı.');
        } else {
          showLocalToast('Randevu reddedildi.', true);
        }
        return;
      }
    } catch(e) {
      console.warn("Local storage update error:", e);
    }
  }

  try {
    const { error } = await window.supabaseClient
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
       console.warn("Supabase admin update hatası:", error.message);
    }

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

window.loadAdminCustomers = async function () {
  const container = document.getElementById("admin-customers-list");
  if (!container) return;

  try {
     let merged = [];
     
     // 1. Güvenli bir şekilde local kayıtları ekle
     try { 
         let users = JSON.parse(localStorage.getItem("hk_users_db"));
         if (Array.isArray(users)) {
             users.forEach(u => {
                 if (u && u.role === 'user') {
                     merged.push({ 
                       fname: u.fname || u.name || "İsimsiz", 
                       lname: u.lname || "", 
                       email: u.email || "kayitli-degil@gmail.com" 
                     });
                 }
             });
         }
     } catch(e) { }

     // 2. Supabase appointments tablosundan tüm kullanıcıları (kayıtlı + misafir/sadece randevu alan) çek
     try {
       const { data } = await window.supabaseClient.from('appointments').select('*');
       if (data && Array.isArray(data)) {
          // Önce 'registered' olanları asıl üye olarak ekle
          data.filter(a => a.status === 'registered').forEach(app => {
             if (app && app.user_name) {
                 let uName = String(app.user_name);
                 let uEmail = app.email || "Belirtilmedi";
                 let uPhone = app.expert || "Telefon Belirtilmemiş";
                 
                 let isDuplicate = false;
                 for (let i = 0; i < merged.length; i++) {
                     if (merged[i].email === uEmail || merged[i].fname.indexOf(uName) !== -1) { isDuplicate = true; break; }
                 }
                 if (!isDuplicate) {
                     let parts = uName.split(' ');
                     let lName = parts.length > 1 ? parts.pop() : "";
                     let fName = parts.join(' ');
                     merged.push({ 
                       fname: fName, 
                       lname: lName, 
                       email: uEmail,
                       phone: uPhone
                     });
                 }
             }
          });
          
          // Sonra form doldurup kaydolmamış sadece randevu alan eski kullanıcıları (misafirleri) ekle
          data.filter(a => a.status !== 'registered' && a.status !== 'message').forEach(app => {
             if (app && app.user_name && String(app.user_name).trim() !== "" && app.user_name !== "Misafir") {
                 let uName = String(app.user_name);
                 let isDuplicate = false;
                 for (let i = 0; i < merged.length; i++) {
                     let existingFullName = String(merged[i].fname + " " + (merged[i].lname||""));
                     if (existingFullName.indexOf(uName) !== -1 || uName.indexOf(merged[i].fname) !== -1) {
                         isDuplicate = true; break;
                     }
                 }
                 if (!isDuplicate) {
                     merged.push({ 
                       fname: uName, 
                       lname: "(Randevu Müşterisi)", 
                       email: uName.replace(/\s/g, "").toLowerCase() + "@gmail.com",
                       phone: "Telefon Belirtilmemiş"
                     });
                 }
             }
          });
       }
     } catch(err) { 
         container.innerHTML = `<div style="padding:40px; text-align:center; color:red;">Kritik Hata: ${err.message}</div>`;
         return;
     }

     if (merged.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Henüz sisteme kayıtlı müşteri bulunmuyor.</div>';
        return;
     }

     let htmlString = "";
     for (let i = 0; i < merged.length; i++) {
        let user = merged[i];
        let badgeType = (i % 3 === 0) ? '<span class="badge" style="background:#e3f2fd; color:#1565c0;">VIP</span>' : '<span class="badge" style="background:#f5f5f5; color:#616161;">Standart</span>';
        let phoneNum = user.phone || "Telefon Belirtilmemiş";
        
        let safeName = String(user.fname || "İsimsiz Kullanıcı");
        let safeLname = user.lname ? " " + String(user.lname) : "";

        htmlString += `
          <div class="appointment-row">
            <div class="app-details">
              <h3>${safeName}${safeLname}</h3>
              <p>
                <span><i class="fa-regular fa-envelope"></i> ${user.email}</span>
                <span><i class="fa-solid fa-phone"></i> ${phoneNum}</span>
              </p>
            </div>
            <div class="app-status">
              ${badgeType}
              <div style="display:flex; gap:8px;">
                <button class="btn btn--outline btn--sm" onclick="showLocalToast('Müşteri detayı henüz aktif değil.')"><i class="fa-solid fa-pen"></i> Düzenle</button>
                <button class="btn btn--sm" style="background:#f44336; color:#fff; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;" onclick="deleteAdminCustomer('${user.email}', '${safeName}${safeLname}')"><i class="fa-solid fa-trash"></i> Sil</button>
              </div>
            </div>
          </div>
        `;
     }
     container.innerHTML = htmlString;
  } catch(e) {
     container.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">Henüz sisteme kayıtlı müşteri bulunmuyor.</div>';
  }
};

window.deleteAdminAppointment = async function(id) {
  if (!confirm("Bu randevuyu kalıcı olarak silmek istediğinize emin misiniz?")) return;

  if (String(id).startsWith("local-")) {
    try {
      let localAppointments = JSON.parse(localStorage.getItem("hk_appointments_db")) || [];
      const index = localAppointments.findIndex(app => String(app.id) === String(id));
      if (index !== -1) {
        localAppointments.splice(index, 1);
        localStorage.setItem("hk_appointments_db", JSON.stringify(localAppointments));
        showLocalToast("Randevu başarıyla silindi.", false);
        loadAdminAppointments();
        return;
      }
    } catch(e) {
      console.warn("Local storage delete error:", e);
    }
  }

  try {
    const { error } = await window.supabaseClient
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn("Supabase admin delete hatası:", error.message);
      showLocalToast("Kayıt veritabanından silinemedi.", true);
      return;
    }
    
    showLocalToast("Randevu başarıyla silindi.", false);
    loadAdminAppointments();
  } catch(err) {
    console.error(err);
    showLocalToast("Silme işlemi sırasında hata oluştu.", true);
  }
};

window.deleteAdminCustomer = async function(email, fullName) {
  if (!confirm("Bu müşteriyi (ve varsa geçmiş randevularını) sistemden silmek istediğinize emin misiniz?")) return;

  try {
    // 1. LocalStorage üzerinden de sil (Varsa)
    let users = JSON.parse(localStorage.getItem("hk_users_db")) || [];
    const index = users.findIndex(u => u.email === email);
    if (index !== -1) {
      users.splice(index, 1);
      localStorage.setItem("hk_users_db", JSON.stringify(users));
    }

    // 2. Supabase Cloud'dan Sil
    fullName = fullName ? fullName.trim() : null;
    
    // Asıl kayıtlı olanı (registered) email üzerinden sil
    if (email && email.indexOf("@") !== -1) {
       await window.supabaseClient.from('appointments').delete().eq('email', email).eq('status', 'registered');
    }
    
    // Eski/eski nesil randevuları isim üzerinden sil
    if (fullName) {
       await window.supabaseClient.from('appointments').delete().eq('user_name', fullName);
    }

    showLocalToast("Müşteri başarıyla silindi.", false);
    loadAdminCustomers();
  } catch(e) {
    console.error(e);
    showLocalToast("Silme işlemi sırasında hata oluştu.", true);
  }
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

// --- Admin Quick Notes ---
window.loadAdminNotes = function() {
  const container = document.getElementById("admin-notes-list");
  if (!container) return;

  let notes = [];
  try {
    notes = JSON.parse(localStorage.getItem("hk_admin_notes")) || [];
  } catch(e) {}

  if (notes.length === 0) {
    container.innerHTML = '<div style="color:#888; font-size:0.9rem; font-style:italic;">Henüz not eklenmedi.</div>';
    return;
  }

  container.innerHTML = notes.map(note => `
    <div style="background:#fdfdfd; border-left:3px solid var(--color-gold); padding:10px; margin-bottom:10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:0.95rem;">${note.text}</span>
      <button onclick="window.deleteAdminNote('${note.id}')" style="background:none; border:none; color:#f44336; cursor:pointer;" title="Sil"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
};

window.saveAdminNote = function() {
  const input = document.getElementById("admin-new-note");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  let notes = [];
  try {
    notes = JSON.parse(localStorage.getItem("hk_admin_notes")) || [];
  } catch(e) {}

  notes.unshift({
    id: "note-" + Date.now(),
    text: text
  });

  localStorage.setItem("hk_admin_notes", JSON.stringify(notes));
  input.value = '';
  showLocalToast("Not eklendi.");
  loadAdminNotes();
};

window.deleteAdminNote = function(id) {
  let notes = [];
  try {
    notes = JSON.parse(localStorage.getItem("hk_admin_notes")) || [];
  } catch(e) {}

  notes = notes.filter(n => n.id !== id);
  localStorage.setItem("hk_admin_notes", JSON.stringify(notes));
  loadAdminNotes();
};

