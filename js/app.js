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
    updateDoc,
    doc,
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
const btnModifica = document.getElementById('btnModifica');
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

// Locandina
const locandinaSection = document.getElementById('locandinaSection');
const locandinaImg = document.getElementById('locandinaImg');

// Modify booking
const modifyLookupWrapper = document.getElementById('modifyLookupWrapper');
const modifyFormWrapper = document.getElementById('modifyFormWrapper');
const lookupForm = document.getElementById('lookupForm');
const lookupResults = document.getElementById('lookupResults');
const lookupResultsList = document.getElementById('lookupResultsList');
const lookupEmpty = document.getElementById('lookupEmpty');
const modifyForm = document.getElementById('modifyForm');
const btnCancelModify = document.getElementById('btnCancelModify');
const modifyFormSubtitle = document.getElementById('modifyFormSubtitle');

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

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Load Events ---
async function loadEvents() {
    try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        const events = [];
        snapshot.forEach(d => {
            events.push({ id: d.id, ...d.data() });
        });

        const nowDate = new Date();
        const upcomingEvents = events.filter(e => e.date.toDate() >= nowDate);
        const pastEvents = events.filter(e => e.date.toDate() < nowDate);

        if (upcomingEvents.length > 0) {
            currentEvent = upcomingEvents[upcomingEvents.length - 1];
            showCurrentEvent(currentEvent);
        } else {
            showNoEvent();
        }

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
    eventDateHero.textContent = formatDateTime(event.date);
    bookingEventId.value = event.id;

    // Locandina
    if (event.imageUrl) {
        locandinaImg.src = event.imageUrl;
        locandinaSection.classList.remove('hidden');
    }

    // Check if booking is still open
    const deadlineDate = event.bookingDeadline.toDate();
    const now = new Date();
    const bookingOpen = now < deadlineDate;

    if (bookingOpen) {
        startCountdown(deadlineDate);
        bookingFormWrapper.classList.remove('hidden');
        bookingClosed.classList.add('hidden');
        btnPrenota.classList.remove('hidden');
        btnModifica.classList.remove('hidden');
        bookingFormSubtitle.textContent = `Prenota per: ${event.title}`;
    } else {
        countdownWrapper.innerHTML = '<div class="countdown-expired">Prenotazioni chiuse</div>';
        bookingFormWrapper.classList.add('hidden');
        bookingClosed.classList.remove('hidden');
        btnPrenota.classList.add('hidden');
        btnModifica.classList.add('hidden');
        // Hide modify section too
        document.getElementById('modifica').classList.add('hidden');
    }

    buildDetailsGrid(event);
}

function showNoEvent() {
    heroNoEvent.classList.remove('hidden');
    eventDetailsSection.classList.add('hidden');
    bookingSection.classList.add('hidden');
    document.getElementById('modifica').classList.add('hidden');
}

// --- Build Event Details Grid ---
function buildDetailsGrid(event) {
    let html = '';

    html += `
        <div class="detail-card">
            <div class="icon">&#128197;</div>
            <h4>Quando</h4>
            <p>${formatDateTime(event.date)}</p>
        </div>`;

    if (event.location) {
        html += `
        <div class="detail-card">
            <div class="icon">&#128205;</div>
            <h4>Dove</h4>
            <p>${escapeHtml(event.location)}</p>
        </div>`;
    }

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

    if (event.bookingDeadline) {
        html += `
        <div class="detail-card">
            <div class="icon">&#9200;</div>
            <h4>Scadenza Prenotazioni</h4>
            <p>${formatDateTime(event.bookingDeadline)}</p>
        </div>`;
    }

    if (event.menu) {
        const menuHtml = escapeHtml(event.menu).replace(/\n/g, '<br>');
        html += `
        <div class="detail-card" style="grid-column: 1 / -1;">
            <div class="icon">&#127860;</div>
            <h4>Menu</h4>
            <p>${menuHtml}</p>
        </div>`;
    }

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
            btnModifica.classList.add('hidden');
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
    bookingForm.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));

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

    let valid = true;
    if (!name) {
        document.getElementById('bkName').closest('.form-group').classList.add('error');
        valid = false;
    }
    if (adults <= 0 && children <= 0) {
        document.getElementById('bkAdults').closest('.form-group').classList.add('error');
        valid = false;
    }

    if (!valid) return;

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

btnNewBooking.addEventListener('click', () => {
    bookingConfirmation.classList.add('hidden');
    bookingFormWrapper.classList.remove('hidden');
});

// --- Booking Lookup & Modification ---
lookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    lookupForm.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));

    const lookupName = document.getElementById('lookupName').value.trim();
    if (!lookupName) {
        document.getElementById('lookupName').closest('.form-group').classList.add('error');
        return;
    }

    if (!currentEvent) return;

    try {
        const q = query(
            collection(db, 'bookings'),
            where('eventId', '==', currentEvent.id)
        );
        const snapshot = await getDocs(q);

        const results = [];
        snapshot.forEach(d => {
            const data = d.data();
            if (data.name && data.name.toLowerCase().includes(lookupName.toLowerCase())) {
                results.push({ id: d.id, ...data });
            }
        });

        if (results.length === 0) {
            lookupResults.classList.add('hidden');
            lookupEmpty.classList.remove('hidden');
        } else {
            lookupEmpty.classList.add('hidden');
            lookupResults.classList.remove('hidden');

            let html = '';
            results.forEach(b => {
                html += `
                <div class="lookup-result-card" data-id="${b.id}">
                    <div>
                        <strong>${escapeHtml(b.name)}</strong><br>
                        <span class="text-muted" style="font-size:0.85rem;">
                            ${b.adults || 0} adulti, ${b.children || 0} bambini &middot;
                            ${b.eating || 0} mangiano
                            ${b.allergies ? ' &middot; Allergie: ' + escapeHtml(b.allergies) : ''}
                        </span>
                    </div>
                    <button class="btn btn-sm btn-secondary btn-select-booking" data-id="${b.id}">Modifica</button>
                </div>`;
            });
            lookupResultsList.innerHTML = html;

            // Attach click handlers
            lookupResultsList.querySelectorAll('.btn-select-booking').forEach(btn => {
                btn.addEventListener('click', () => {
                    const booking = results.find(r => r.id === btn.dataset.id);
                    if (booking) openModifyForm(booking);
                });
            });
        }
    } catch (error) {
        console.error('Errore ricerca:', error);
        showToast('Errore nella ricerca. Riprova.', 'error');
    }
});

function openModifyForm(booking) {
    modifyLookupWrapper.classList.add('hidden');
    modifyFormWrapper.classList.remove('hidden');
    modifyFormSubtitle.textContent = `Modifica prenotazione di ${booking.name}`;

    document.getElementById('modBkId').value = booking.id;
    document.getElementById('modBkName').value = booking.name || '';
    document.getElementById('modBkPhone').value = booking.phone || '';
    document.getElementById('modBkEmail').value = booking.email || '';
    document.getElementById('modBkAdults').value = booking.adults || 0;
    document.getElementById('modBkChildren').value = booking.children || 0;
    document.getElementById('modBkEating').value = booking.eating || 0;
    document.getElementById('modBkNotEating').value = booking.notEating || 0;
    document.getElementById('modBkMember').checked = booking.isMember || false;
    document.getElementById('modBkAllergies').value = booking.allergies || '';
    document.getElementById('modBkNotes').value = booking.notes || '';
}

btnCancelModify.addEventListener('click', () => {
    modifyFormWrapper.classList.add('hidden');
    modifyLookupWrapper.classList.remove('hidden');
});

modifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('modBkId').value;
    const adults = parseInt(document.getElementById('modBkAdults').value) || 0;
    const children = parseInt(document.getElementById('modBkChildren').value) || 0;
    const eating = parseInt(document.getElementById('modBkEating').value) || 0;
    const notEating = parseInt(document.getElementById('modBkNotEating').value) || 0;

    const updatedData = {
        name: document.getElementById('modBkName').value.trim(),
        phone: document.getElementById('modBkPhone').value.trim(),
        email: document.getElementById('modBkEmail').value.trim(),
        adults,
        children,
        totalPeople: adults + children,
        eating,
        notEating,
        isMember: document.getElementById('modBkMember').checked,
        allergies: document.getElementById('modBkAllergies').value.trim(),
        notes: document.getElementById('modBkNotes').value.trim()
    };

    if (!updatedData.name) {
        showToast('Il nome è obbligatorio', 'warning');
        return;
    }

    try {
        await updateDoc(doc(db, 'bookings', id), updatedData);
        showToast('Prenotazione aggiornata con successo!');
        modifyFormWrapper.classList.add('hidden');
        modifyLookupWrapper.classList.remove('hidden');
        lookupResults.classList.add('hidden');
        lookupEmpty.classList.add('hidden');
        document.getElementById('lookupName').value = '';
    } catch (error) {
        console.error('Errore aggiornamento:', error);
        showToast('Errore nell\'aggiornamento. Riprova.', 'error');
    }
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
