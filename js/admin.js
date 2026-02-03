// ============================================
// Contrada San Magno - Admin Panel Logic
// ============================================

import { db, auth } from './firebase-config.js';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// --- DOM Elements ---
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminEmail = document.getElementById('adminEmail');
const adminSidebar = document.getElementById('adminSidebar');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const adminEventSelect = document.getElementById('adminEventSelect');
const toastEl = document.getElementById('toast');

// Stats
const statTotalPeople = document.getElementById('statTotalPeople');
const statTotalBookings = document.getElementById('statTotalBookings');
const statEating = document.getElementById('statEating');
const statNotEating = document.getElementById('statNotEating');
const statChildren = document.getElementById('statChildren');
const statKitchen = document.getElementById('statKitchen');
const statGrandTotal = document.getElementById('statGrandTotal');
const statSeats = document.getElementById('statSeats');

// Events
const eventsTableBody = document.getElementById('eventsTableBody');
const eventFormWrapper = document.getElementById('eventFormWrapper');
const eventForm = document.getElementById('eventForm');
const eventFormTitle = document.getElementById('eventFormTitle');
const btnNewEvent = document.getElementById('btnNewEvent');
const btnCancelEvent = document.getElementById('btnCancelEvent');

// Bookings
const bookingsTableWrapper = document.getElementById('bookingsTableWrapper');
const bookingsTableBody = document.getElementById('bookingsTableBody');
const noBookings = document.getElementById('noBookings');
const bookingsCount = document.getElementById('bookingsCount');
const btnAddBooking = document.getElementById('btnAddBooking');

// Edit Booking Modal
const editBookingModal = document.getElementById('editBookingModal');
const editBookingForm = document.getElementById('editBookingForm');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEditModal = document.getElementById('cancelEditModal');

// Add Booking Modal
const addBookingModal = document.getElementById('addBookingModal');
const addBookingForm = document.getElementById('addBookingForm');
const closeAddModal = document.getElementById('closeAddModal');

// Kitchen
const kitchenForm = document.getElementById('kitchenForm');
const kitchenList = document.getElementById('kitchenList');
const kitchenCount = document.getElementById('kitchenCount');

// Allergy summary
const allergySummary = document.getElementById('allergySummary');
const allergyTableBody = document.getElementById('allergyTableBody');

// --- State ---
let allEvents = [];
let currentBookings = [];
let currentKitchenStaff = [];
let selectedEventId = '';

// --- Helpers ---
const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

function formatDate(ts) {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(ts) {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${h}:${m}`;
}

function toLocalDateTimeString(ts) {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${da}T${h}:${mi}`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    toastEl.textContent = message;
    toastEl.className = `toast toast-${type} show`;
    setTimeout(() => toastEl.classList.remove('show'), 4000);
}

// --- Authentication ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        adminEmail.textContent = user.email;
        loadAllEvents();
    } else {
        loginScreen.classList.remove('hidden');
        adminPanel.classList.add('hidden');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            loginError.textContent = 'Email o password non corretti.';
        } else {
            loginError.textContent = 'Errore di accesso. Riprova.';
        }
    }
});

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth);
});

// --- Mobile sidebar ---
mobileMenuToggle.addEventListener('click', () => {
    adminSidebar.classList.toggle('open');
});

// --- Navigation ---
document.querySelectorAll('.admin-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;

        // Update active link
        document.querySelectorAll('.admin-nav a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Show section
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${section}`).classList.add('active');

        // Close mobile sidebar
        adminSidebar.classList.remove('open');
    });
});

// --- Load All Events ---
async function loadAllEvents() {
    try {
        const q = query(collection(db, 'events'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        allEvents = [];
        snapshot.forEach(doc => {
            allEvents.push({ id: doc.id, ...doc.data() });
        });

        renderEventsTable();
        populateEventSelector();

        // Auto-select the first upcoming event
        const now = new Date();
        const upcoming = allEvents.find(e => e.date.toDate() >= now);
        if (upcoming) {
            adminEventSelect.value = upcoming.id;
            selectedEventId = upcoming.id;
            loadEventData(upcoming.id);
        } else if (allEvents.length > 0) {
            adminEventSelect.value = allEvents[0].id;
            selectedEventId = allEvents[0].id;
            loadEventData(allEvents[0].id);
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('Errore nel caricamento degli eventi', 'error');
    }
}

function populateEventSelector() {
    let html = '<option value="">-- Seleziona evento --</option>';
    allEvents.forEach(e => {
        const dateStr = formatDate(e.date);
        html += `<option value="${e.id}">${escapeHtml(e.title)} - ${dateStr}</option>`;
    });
    adminEventSelect.innerHTML = html;
}

// --- Event Selector Change ---
adminEventSelect.addEventListener('change', (e) => {
    selectedEventId = e.target.value;
    if (selectedEventId) {
        loadEventData(selectedEventId);
    } else {
        clearEventData();
    }
});

async function loadEventData(eventId) {
    await Promise.all([
        loadBookings(eventId),
        loadKitchenStaff(eventId)
    ]);
    updateStats();
}

function clearEventData() {
    currentBookings = [];
    currentKitchenStaff = [];
    noBookings.classList.remove('hidden');
    bookingsTableWrapper.classList.add('hidden');
    kitchenList.innerHTML = '<div class="empty-state"><div class="empty-icon">&#127859;</div><p>Nessuno staff cucina</p></div>';
    resetStats();
}

// --- Events Table ---
function renderEventsTable() {
    if (allEvents.length === 0) {
        eventsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:30px">Nessun evento creato</td></tr>';
        return;
    }

    const now = new Date();
    let html = '';

    allEvents.forEach(event => {
        const eventDate = event.date.toDate();
        const deadlineDate = event.bookingDeadline.toDate();
        const isPast = eventDate < now;
        const isBookingOpen = deadlineDate > now;

        let statusBadge;
        if (isPast) {
            statusBadge = '<span class="badge badge-closed">Concluso</span>';
        } else if (isBookingOpen) {
            statusBadge = '<span class="badge badge-active">Prenotazioni aperte</span>';
        } else {
            statusBadge = '<span class="badge" style="background:#FFF3E0;color:#E65100;">Prenotazioni chiuse</span>';
        }

        html += `
        <tr>
            <td><strong>${escapeHtml(event.title)}</strong></td>
            <td>${formatDateTime(event.date)}</td>
            <td>${escapeHtml(event.location || '-')}</td>
            <td>${formatDateTime(event.bookingDeadline)}</td>
            <td>${statusBadge}</td>
            <td class="actions">
                <button class="btn btn-sm btn-outline" onclick="window.adminApp.editEvent('${event.id}')">Modifica</button>
                <button class="btn btn-sm btn-danger" onclick="window.adminApp.deleteEvent('${event.id}')">Elimina</button>
            </td>
        </tr>`;
    });

    eventsTableBody.innerHTML = html;
}

// --- Event Form ---
btnNewEvent.addEventListener('click', () => {
    resetEventForm();
    eventFormTitle.textContent = 'Nuovo Evento';
    eventFormWrapper.classList.remove('hidden');
});

btnCancelEvent.addEventListener('click', () => {
    eventFormWrapper.classList.add('hidden');
});

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('evId').value;
    const title = document.getElementById('evTitle').value.trim();
    const description = document.getElementById('evDescription').value.trim();
    const dateStr = document.getElementById('evDate').value;
    const deadlineStr = document.getElementById('evDeadline').value;
    const location = document.getElementById('evLocation').value.trim();
    const menu = document.getElementById('evMenu').value.trim();
    const costMembers = parseFloat(document.getElementById('evCostMember').value) || 0;
    const costNonMembers = parseFloat(document.getElementById('evCostNonMember').value) || 0;
    const maxSeats = parseInt(document.getElementById('evMaxSeats').value) || null;

    if (!title || !dateStr || !deadlineStr || !location) {
        showToast('Compila tutti i campi obbligatori', 'warning');
        return;
    }

    const eventData = {
        title,
        description,
        date: Timestamp.fromDate(new Date(dateStr)),
        bookingDeadline: Timestamp.fromDate(new Date(deadlineStr)),
        location,
        menu,
        costMembers,
        costNonMembers,
        maxSeats
    };

    try {
        if (id) {
            await updateDoc(doc(db, 'events', id), eventData);
            showToast('Evento aggiornato!');
        } else {
            eventData.createdAt = Timestamp.now();
            await addDoc(collection(db, 'events'), eventData);
            showToast('Evento creato!');
        }

        eventFormWrapper.classList.add('hidden');
        await loadAllEvents();
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Errore nel salvataggio dell\'evento', 'error');
    }
});

function resetEventForm() {
    document.getElementById('evId').value = '';
    document.getElementById('evTitle').value = '';
    document.getElementById('evDescription').value = '';
    document.getElementById('evDate').value = '';
    document.getElementById('evDeadline').value = '';
    document.getElementById('evLocation').value = '';
    document.getElementById('evMenu').value = '';
    document.getElementById('evCostMember').value = '';
    document.getElementById('evCostNonMember').value = '';
    document.getElementById('evMaxSeats').value = '';
}

// --- Bookings ---
async function loadBookings(eventId) {
    try {
        const q = query(
            collection(db, 'bookings'),
            where('eventId', '==', eventId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);

        currentBookings = [];
        snapshot.forEach(doc => {
            currentBookings.push({ id: doc.id, ...doc.data() });
        });

        renderBookingsTable();
    } catch (error) {
        console.error('Error loading bookings:', error);
        showToast('Errore nel caricamento prenotazioni', 'error');
    }
}

function renderBookingsTable() {
    if (currentBookings.length === 0) {
        noBookings.classList.remove('hidden');
        bookingsTableWrapper.classList.add('hidden');
        return;
    }

    noBookings.classList.add('hidden');
    bookingsTableWrapper.classList.remove('hidden');
    bookingsCount.textContent = `${currentBookings.length} prenotazion${currentBookings.length !== 1 ? 'i' : 'e'}`;

    let html = '';
    currentBookings.forEach(b => {
        const allergyFlag = b.allergies ? `<span title="${escapeHtml(b.allergies)}" style="cursor:help;">&#9888; ${escapeHtml(b.allergies.substring(0, 30))}${b.allergies.length > 30 ? '...' : ''}</span>` : '-';
        html += `
        <tr>
            <td><strong>${escapeHtml(b.name)}</strong></td>
            <td>${escapeHtml(b.phone)}</td>
            <td>${b.adults || 0}</td>
            <td>${b.children || 0}</td>
            <td>${b.eating || 0}</td>
            <td>${b.notEating || 0}</td>
            <td>${b.isMember ? '<span class="badge badge-active">Si</span>' : 'No'}</td>
            <td>${allergyFlag}</td>
            <td class="actions">
                <button class="btn btn-sm btn-outline" onclick="window.adminApp.editBooking('${b.id}')">Modifica</button>
                <button class="btn btn-sm btn-danger" onclick="window.adminApp.deleteBooking('${b.id}')">Elimina</button>
            </td>
        </tr>`;
    });

    bookingsTableBody.innerHTML = html;
}

// --- Edit Booking ---
function openEditBookingModal(bookingId) {
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) return;

    document.getElementById('editBkId').value = booking.id;
    document.getElementById('editBkName').value = booking.name || '';
    document.getElementById('editBkPhone').value = booking.phone || '';
    document.getElementById('editBkEmail').value = booking.email || '';
    document.getElementById('editBkAdults').value = booking.adults || 0;
    document.getElementById('editBkChildren').value = booking.children || 0;
    document.getElementById('editBkEating').value = booking.eating || 0;
    document.getElementById('editBkNotEating').value = booking.notEating || 0;
    document.getElementById('editBkMember').checked = booking.isMember || false;
    document.getElementById('editBkAllergies').value = booking.allergies || '';
    document.getElementById('editBkNotes').value = booking.notes || '';

    editBookingModal.classList.add('active');
}

closeEditModal.addEventListener('click', () => editBookingModal.classList.remove('active'));
cancelEditModal.addEventListener('click', () => editBookingModal.classList.remove('active'));

editBookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editBkId').value;
    const adults = parseInt(document.getElementById('editBkAdults').value) || 0;
    const children = parseInt(document.getElementById('editBkChildren').value) || 0;
    const eating = parseInt(document.getElementById('editBkEating').value) || 0;
    const notEating = parseInt(document.getElementById('editBkNotEating').value) || 0;

    const updatedData = {
        name: document.getElementById('editBkName').value.trim(),
        phone: document.getElementById('editBkPhone').value.trim(),
        email: document.getElementById('editBkEmail').value.trim(),
        adults,
        children,
        totalPeople: adults + children,
        eating,
        notEating,
        isMember: document.getElementById('editBkMember').checked,
        allergies: document.getElementById('editBkAllergies').value.trim(),
        notes: document.getElementById('editBkNotes').value.trim()
    };

    try {
        await updateDoc(doc(db, 'bookings', id), updatedData);
        editBookingModal.classList.remove('active');
        showToast('Prenotazione aggiornata!');
        await loadBookings(selectedEventId);
        updateStats();
    } catch (error) {
        console.error('Error updating booking:', error);
        showToast('Errore nell\'aggiornamento', 'error');
    }
});

// --- Add Booking (Admin) ---
btnAddBooking.addEventListener('click', () => {
    if (!selectedEventId) {
        showToast('Seleziona prima un evento', 'warning');
        return;
    }
    // Reset form
    addBookingForm.reset();
    document.getElementById('addBkAdults').value = 1;
    document.getElementById('addBkChildren').value = 0;
    document.getElementById('addBkEating').value = 1;
    document.getElementById('addBkNotEating').value = 0;
    addBookingModal.classList.add('active');
});

closeAddModal.addEventListener('click', () => addBookingModal.classList.remove('active'));

addBookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const adults = parseInt(document.getElementById('addBkAdults').value) || 0;
    const children = parseInt(document.getElementById('addBkChildren').value) || 0;
    const eating = parseInt(document.getElementById('addBkEating').value) || 0;
    const notEating = parseInt(document.getElementById('addBkNotEating').value) || 0;

    const bookingData = {
        eventId: selectedEventId,
        name: document.getElementById('addBkName').value.trim(),
        phone: document.getElementById('addBkPhone').value.trim(),
        email: document.getElementById('addBkEmail').value.trim(),
        adults,
        children,
        totalPeople: adults + children,
        eating,
        notEating,
        isMember: document.getElementById('addBkMember').checked,
        allergies: document.getElementById('addBkAllergies').value.trim(),
        notes: document.getElementById('addBkNotes').value.trim(),
        status: 'confirmed',
        createdAt: Timestamp.now()
    };

    if (!bookingData.name || !bookingData.phone) {
        showToast('Nome e telefono sono obbligatori', 'warning');
        return;
    }

    try {
        await addDoc(collection(db, 'bookings'), bookingData);
        addBookingModal.classList.remove('active');
        showToast('Prenotazione aggiunta!');
        await loadBookings(selectedEventId);
        updateStats();
    } catch (error) {
        console.error('Error adding booking:', error);
        showToast('Errore nell\'aggiunta', 'error');
    }
});

// --- Delete Booking ---
async function deleteBooking(bookingId) {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) return;

    try {
        await deleteDoc(doc(db, 'bookings', bookingId));
        showToast('Prenotazione eliminata');
        await loadBookings(selectedEventId);
        updateStats();
    } catch (error) {
        console.error('Error deleting booking:', error);
        showToast('Errore nell\'eliminazione', 'error');
    }
}

// --- Delete Event ---
async function deleteEvent(eventId) {
    if (!confirm('Sei sicuro di voler eliminare questo evento? Verranno eliminate anche tutte le prenotazioni associate.')) return;

    try {
        // Delete associated bookings
        const bookingsQ = query(collection(db, 'bookings'), where('eventId', '==', eventId));
        const bookingsSnap = await getDocs(bookingsQ);
        const deletePromises = [];
        bookingsSnap.forEach(d => {
            deletePromises.push(deleteDoc(doc(db, 'bookings', d.id)));
        });

        // Delete associated kitchen staff
        const kitchenQ = query(collection(db, 'kitchenStaff'), where('eventId', '==', eventId));
        const kitchenSnap = await getDocs(kitchenQ);
        kitchenSnap.forEach(d => {
            deletePromises.push(deleteDoc(doc(db, 'kitchenStaff', d.id)));
        });

        // Delete the event
        deletePromises.push(deleteDoc(doc(db, 'events', eventId)));

        await Promise.all(deletePromises);
        showToast('Evento eliminato');
        await loadAllEvents();
        clearEventData();
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Errore nell\'eliminazione dell\'evento', 'error');
    }
}

// --- Edit Event ---
function editEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

    // Navigate to events section
    document.querySelectorAll('.admin-nav a').forEach(l => l.classList.remove('active'));
    document.querySelector('.admin-nav a[data-section="events"]').classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-events').classList.add('active');

    // Fill form
    eventFormTitle.textContent = 'Modifica Evento';
    document.getElementById('evId').value = event.id;
    document.getElementById('evTitle').value = event.title || '';
    document.getElementById('evDescription').value = event.description || '';
    document.getElementById('evDate').value = toLocalDateTimeString(event.date);
    document.getElementById('evDeadline').value = toLocalDateTimeString(event.bookingDeadline);
    document.getElementById('evLocation').value = event.location || '';
    document.getElementById('evMenu').value = event.menu || '';
    document.getElementById('evCostMember').value = event.costMembers || '';
    document.getElementById('evCostNonMember').value = event.costNonMembers || '';
    document.getElementById('evMaxSeats').value = event.maxSeats || '';

    eventFormWrapper.classList.remove('hidden');
    eventFormWrapper.scrollIntoView({ behavior: 'smooth' });
}

// --- Kitchen Staff ---
async function loadKitchenStaff(eventId) {
    try {
        const q = query(
            collection(db, 'kitchenStaff'),
            where('eventId', '==', eventId)
        );
        const snapshot = await getDocs(q);

        currentKitchenStaff = [];
        snapshot.forEach(doc => {
            currentKitchenStaff.push({ id: doc.id, ...doc.data() });
        });

        renderKitchenStaff();
    } catch (error) {
        console.error('Error loading kitchen staff:', error);
    }
}

function renderKitchenStaff() {
    kitchenCount.textContent = `${currentKitchenStaff.length} person${currentKitchenStaff.length !== 1 ? 'e' : 'a'}`;

    if (currentKitchenStaff.length === 0) {
        kitchenList.innerHTML = '<div class="empty-state"><div class="empty-icon">&#127859;</div><p>Nessuno staff cucina aggiunto</p></div>';
        return;
    }

    let html = '<div class="staff-list">';
    currentKitchenStaff.forEach(s => {
        html += `
        <div class="staff-item">
            <div>
                <span class="staff-name">${escapeHtml(s.name)}</span>
                ${s.role ? `<span class="staff-role"> - ${escapeHtml(s.role)}</span>` : ''}
            </div>
            <button class="btn btn-sm btn-danger" onclick="window.adminApp.deleteStaff('${s.id}')">Rimuovi</button>
        </div>`;
    });
    html += '</div>';
    kitchenList.innerHTML = html;
}

kitchenForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedEventId) {
        showToast('Seleziona prima un evento', 'warning');
        return;
    }

    const name = document.getElementById('staffName').value.trim();
    const role = document.getElementById('staffRole').value.trim();

    if (!name) {
        showToast('Inserisci il nome', 'warning');
        return;
    }

    try {
        await addDoc(collection(db, 'kitchenStaff'), {
            eventId: selectedEventId,
            name,
            role,
            createdAt: Timestamp.now()
        });

        kitchenForm.reset();
        showToast('Staff aggiunto!');
        await loadKitchenStaff(selectedEventId);
        updateStats();
    } catch (error) {
        console.error('Error adding staff:', error);
        showToast('Errore nell\'aggiunta dello staff', 'error');
    }
});

async function deleteStaff(staffId) {
    if (!confirm('Rimuovere questa persona dallo staff cucina?')) return;

    try {
        await deleteDoc(doc(db, 'kitchenStaff', staffId));
        showToast('Staff rimosso');
        await loadKitchenStaff(selectedEventId);
        updateStats();
    } catch (error) {
        console.error('Error deleting staff:', error);
        showToast('Errore nella rimozione', 'error');
    }
}

// --- Stats ---
function updateStats() {
    const confirmedBookings = currentBookings.filter(b => b.status !== 'cancelled');

    const totalPeople = confirmedBookings.reduce((sum, b) => sum + (b.totalPeople || (b.adults || 0) + (b.children || 0)), 0);
    const totalEating = confirmedBookings.reduce((sum, b) => sum + (b.eating || 0), 0);
    const totalNotEating = confirmedBookings.reduce((sum, b) => sum + (b.notEating || 0), 0);
    const totalChildren = confirmedBookings.reduce((sum, b) => sum + (b.children || 0), 0);
    const kitchenCount = currentKitchenStaff.length;
    const grandTotal = totalPeople + kitchenCount;

    statTotalPeople.textContent = totalPeople;
    statTotalBookings.textContent = confirmedBookings.length;
    statEating.textContent = totalEating;
    statNotEating.textContent = totalNotEating;
    statChildren.textContent = totalChildren;
    statKitchen.textContent = kitchenCount;
    statGrandTotal.textContent = grandTotal;
    statSeats.textContent = totalEating; // seats needed = people eating

    // Allergy summary
    const allergies = confirmedBookings.filter(b => b.allergies && b.allergies.trim());
    if (allergies.length > 0) {
        allergySummary.style.display = 'block';
        let html = '';
        allergies.forEach(b => {
            html += `<tr><td>${escapeHtml(b.name)}</td><td>${escapeHtml(b.allergies)}</td></tr>`;
        });
        allergyTableBody.innerHTML = html;
    } else {
        allergySummary.style.display = 'none';
    }
}

function resetStats() {
    statTotalPeople.textContent = '0';
    statTotalBookings.textContent = '0';
    statEating.textContent = '0';
    statNotEating.textContent = '0';
    statChildren.textContent = '0';
    statKitchen.textContent = '0';
    statGrandTotal.textContent = '0';
    statSeats.textContent = '0';
    allergySummary.style.display = 'none';
}

// --- Expose functions to global scope (for onclick handlers) ---
window.adminApp = {
    editEvent,
    deleteEvent,
    editBooking: openEditBookingModal,
    deleteBooking,
    deleteStaff
};
