// ============================================
// Contrada San Magno - Public Page Logic
// ============================================

import { db } from './firebase-config.js';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// --- DOM Elements ---
const heroLoading = document.getElementById('heroLoading');
const heroEvent = document.getElementById('heroEvent');
const heroNoEvent = document.getElementById('heroNoEvent');
const eventTitle = document.getElementById('eventTitle');
const eventDateHero = document.getElementById('eventDateHero');
const countdownWrapper = document.getElementById('countdownWrapper');
const cdDays = document.getElementById('cdDays');
const cdHours = document.getElementById('cdHours');
const cdMins = document.getElementById('cdMins');
const cdSecs = document.getElementById('cdSecs');
const btnPrenota = document.getElementById('btnPrenota');
const detailsGrid = document.getElementById('detailsGrid');
const eventDetailsSection = document.getElementById('eventDetails');
const bookingSection = document.getElementById('prenota');
const bookingFormWrapper = document.getElementById('bookingFormWrapper');
const bookingForm = document.getElementById('bookingForm');
const bookingEventId = document.getElementById('bookingEventId');
const bookingFormSubtitle = document.getElementById('bookingFormSubtitle');
const bookingConfirmation = document.getElementById('bookingConfirmation');
const confirmationDetails = document.getElementById('confirmationDetails');
const bookingClosed = document.getElementById('bookingClosed');
const btnNewBooking = document.getElementById('btnNewBooking');
const btnSubmitBooking = document.getElementById('btnSubmitBooking');
const pastEventsList = document.getElementById('pastEventsList');
const pastEventsSection = document.getElementById('pastEventsSection');
const noPastEvents = document.getElementById('noPastEvents');
const footerYear = document.getElementById('footerYear');
const toastEl = document.getElementById('toast');

// --- State ---
let currentEvent = null;
let countdownInterval = null;

// --- Helpers ---
const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const shortMonths = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function formatDate(date) {
    const d = date instanceof Date ? date : date.toDate();
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(date) {
    const d = date instanceof Date ? date : date.toDate();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} alle ${h}:${m}`;
}

function showToast(message, type = 'success') {
    toastEl.textContent = message;
    toastEl.className = `toast toast-${type} show`;
    setTimeout(() => { toastEl.classList.remove('show'); }, 4000);
}

// --- Load Events ---
async function loadEvents() {
    try {
        const now = Timestamp.now();
        const eventsRef = collection(db, 'events');

        // Get all events ordered by date
        const q = query(eventsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        const events = [];
        snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });

        // Find the current/upcoming event (future date, active)
        const nowDate = new Date();
        const upcomingEvents = events.filter(e => {
            const eventDate = e.date.toDate();
            return eventDate >= nowDate;
        });

        const pastEvents = events.filter(e => {
            const eventDate = e.date.toDate();
            return eventDate < nowDate;
        });

        // Show current event (the nearest upcoming one)
        if (upcomingEvents.length > 0) {
            currentEvent = upcomingEvents[upcomingEvents.length - 1]; // earliest upcoming
            showCurrentEvent(currentEvent);
        } else {
            showNoEvent();
        }

        // Show past events
        showPastEvents(pastEvents);

    } catch (error) {
        console.error('Errore caricamento eventi:', error);
        showNoEvent();
    }

    heroLoading.classList.add('hidden');
}

// --- Show Current Event ---
function showCurrentEvent(event) {
    heroEvent.classList.remove('hidden');
    eventDetailsSection.classList.remove('hidden');

    eventTitle.textContent = event.title;
    const eventDate = event.date.toDate();
    eventDateHero.textContent = formatDateTime(event.date);

    bookingEventId.value = event.id;

    // Check if booking is still open
    const deadlineDate = event.bookingDeadline.toDate();
    const now = new Date();
    const bookingOpen = now < deadlineDate;

    if (bookingOpen) {
        startCountdown(deadlineDate);
        bookingFormWrapper.classList.remove('hidden');
        bookingClosed.classList.add('hidden');
        btnPrenota.classList.remove('hidden');
        bookingFormSubtitle.textContent = `Prenota per: ${event.title}`;
    } else {
        countdownWrapper.innerHTML = '<div class="countdown-expired">Prenotazioni chiuse</div>';
        bookingFormWrapper.classList.add('hidden');
        bookingClosed.classList.remove('hidden');
        btnPrenota.classList.add('hidden');
    }

    // Build details cards
    buildDetailsGrid(event);
}

function showNoEvent() {
    heroNoEvent.classList.remove('hidden');
    eventDetailsSection.classList.add('hidden');
    bookingSection.classList.add('hidden');
}

// --- Build Event Details Grid ---
function buildDetailsGrid(event) {
    let html = '';

    // Date & Time
    html += `
        <div class="detail-card">
            <div class="icon">&#128197;</div>
            <h4>Quando</h4>
            <p>${formatDateTime(event.date)}</p>
        </div>`;

    // Location
    if (event.location) {
        html += `
        <div class="detail-card">
            <div class="icon">&#128205;</div>
            <h4>Dove</h4>
            <p>${escapeHtml(event.location)}</p>
        </div>`;
    }

    // Cost
    if (event.costMembers != null || event.costNonMembers != null) {
        html += `
        <div class="detail-card">
            <div class="icon">&#128176;</div>
            <h4>Costo</h4>
            <div class="price-grid">
                <div class="price-item">
                    <div class="amount">&euro;${event.costMembers || 0}</div>
                    <div class="type">Tesserati</div>
                </div>
                <div class="price-item">
                    <div class="amount">&euro;${event.costNonMembers || 0}</div>
                    <div class="type">Non Tesserati</div>
                </div>
            </div>
        </div>`;
    }

    // Deadline
    if (event.bookingDeadline) {
        html += `
        <div class="detail-card">
            <div class="icon">&#9200;</div>
            <h4>Scadenza Prenotazioni</h4>
            <p>${formatDateTime(event.bookingDeadline)}</p>
        </div>`;
    }

    // Menu
    if (event.menu) {
        const menuHtml = escapeHtml(event.menu).replace(/\n/g, '<br>');
        html += `
        <div class="detail-card" style="grid-column: 1 / -1;">
            <div class="icon">&#127860;</div>
            <h4>Menu</h4>
            <p>${menuHtml}</p>
        </div>`;
    }

    // Description
    if (event.description) {
        const descHtml = escapeHtml(event.description).replace(/\n/g, '<br>');
        html += `
        <div class="detail-card" style="grid-column: 1 / -1;">
            <div class="icon">&#128196;</div>
            <h4>Descrizione</h4>
            <p>${descHtml}</p>
        </div>`;
    }

    detailsGrid.innerHTML = html;
}

// --- Countdown ---
function startCountdown(deadline) {
    function update() {
        const now = new Date();
        const diff = deadline - now;

        if (diff <= 0) {
            clearInterval(countdownInterval);
            countdownWrapper.innerHTML = '<div class="countdown-expired">Prenotazioni chiuse</div>';
            bookingFormWrapper.classList.add('hidden');
            bookingClosed.classList.remove('hidden');
            btnPrenota.classList.add('hidden');
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        cdDays.textContent = String(days).padStart(2, '0');
        cdHours.textContent = String(hours).padStart(2, '0');
        cdMins.textContent = String(mins).padStart(2, '0');
        cdSecs.textContent = String(secs).padStart(2, '0');
    }

    update();
    countdownInterval = setInterval(update, 1000);
}

// --- Booking Form ---
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset errors
    bookingForm.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));

    // Get values
    const name = document.getElementById('bkName').value.trim();
    const phone = document.getElementById('bkPhone').value.trim();
    const email = document.getElementById('bkEmail').value.trim();
    const adults = parseInt(document.getElementById('bkAdults').value) || 0;
    const children = parseInt(document.getElementById('bkChildren').value) || 0;
    const eating = parseInt(document.getElementById('bkEating').value) || 0;
    const notEating = parseInt(document.getElementById('bkNotEating').value) || 0;
    const isMember = document.getElementById('bkMember').checked;
    const allergies = document.getElementById('bkAllergies').value.trim();
    const notes = document.getElementById('bkNotes').value.trim();
    const eventId = bookingEventId.value;

    // Validation
    let valid = true;
    if (!name) {
        document.getElementById('bkName').closest('.form-group').classList.add('error');
        valid = false;
    }
    if (!phone) {
        document.getElementById('bkPhone').closest('.form-group').classList.add('error');
        valid = false;
    }
    if (adults <= 0 && children <= 0) {
        document.getElementById('bkAdults').closest('.form-group').classList.add('error');
        valid = false;
    }
    if (eating + notEating !== adults + children) {
        // Just a warning, not blocking
    }

    if (!valid) return;

    // Disable button
    btnSubmitBooking.disabled = true;
    btnSubmitBooking.innerHTML = '<span class="spinner spinner-white"></span> Invio...';

    try {
        const bookingData = {
            eventId,
            name,
            phone,
            email,
            adults,
            children,
            totalPeople: adults + children,
            eating,
            notEating,
            isMember,
            allergies,
            notes,
            status: 'confirmed',
            createdAt: Timestamp.now()
        };

        await addDoc(collection(db, 'bookings'), bookingData);

        // Show confirmation
        bookingFormWrapper.classList.add('hidden');
        bookingConfirmation.classList.remove('hidden');
        confirmationDetails.innerHTML = `
            <strong>${escapeHtml(name)}</strong><br>
            ${adults + children} person${adults + children > 1 ? 'e' : 'a'} &middot;
            ${eating} mangiano &middot; ${children} bambin${children !== 1 ? 'i' : 'o'}
        `;

        showToast('Prenotazione inviata con successo!');
        bookingForm.reset();

    } catch (error) {
        console.error('Errore prenotazione:', error);
        showToast('Errore nell\'invio della prenotazione. Riprova.', 'error');
    }

    btnSubmitBooking.disabled = false;
    btnSubmitBooking.innerHTML = 'Conferma Prenotazione';
});

// New booking button (after confirmation)
btnNewBooking.addEventListener('click', () => {
    bookingConfirmation.classList.add('hidden');
    bookingFormWrapper.classList.remove('hidden');
});

// --- Past Events ---
function showPastEvents(events) {
    if (events.length === 0) {
        noPastEvents.classList.remove('hidden');
        pastEventsList.classList.add('hidden');
        return;
    }

    let html = '';
    events.forEach(event => {
        const d = event.date.toDate();
        html += `
        <div class="past-event-card">
            <div class="past-event-date">
                <div class="day">${d.getDate()}</div>
                <div class="month">${shortMonths[d.getMonth()]}</div>
            </div>
            <div class="past-event-info">
                <h4>${escapeHtml(event.title)}</h4>
                <p>${escapeHtml(event.location || '')} &middot; ${d.getFullYear()}</p>
            </div>
            <span class="badge badge-closed">Concluso</span>
        </div>`;
    });

    pastEventsList.innerHTML = html;
}

// --- Utility ---
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Footer Year ---
footerYear.textContent = new Date().getFullYear();

// --- Mobile menu toggle (header) ---
const mobileToggle = document.querySelector('.mobile-menu-toggle');
const headerNav = document.querySelector('.header-nav');
if (mobileToggle && headerNav) {
    mobileToggle.addEventListener('click', () => {
        headerNav.style.display = headerNav.style.display === 'block' ? 'none' : 'block';
    });
}

// --- Initialize ---
loadEvents();
