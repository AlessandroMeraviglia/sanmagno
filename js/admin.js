// ============================================
// Contrada San Magno - Admin Panel Logic
// Real-time listeners for instant updates
// ============================================

import { db, auth, storage } from './firebase-config.js';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
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
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';

// --- DOM Elements ---
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminEmail = document.getElementById('adminEmail');
const adminSidebar = document.getElementById('adminSidebar');
const topbarMenuToggle = document.getElementById('topbarMenuToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
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

// Event image
const evImageInput = document.getElementById('evImage');
const evImagePreview = document.getElementById('evImagePreview');
const evImagePreviewImg = document.getElementById('evImagePreviewImg');
const evImageRemove = document.getElementById('evImageRemove');
const evImageUrl = document.getElementById('evImageUrl');

// Bookings
const bookingsTableWrapper = document.getElementById('bookingsTableWrapper');
const bookingsTableBody = document.getElementById('bookingsTableBody');
const noBookings = document.getElementById('noBookings');
const bookingsCount = document.getElementById('bookingsCount');
const btnAddBooking = document.getElementById('btnAddBooking');
const btnPrintList = document.getElementById('btnPrintList');

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
let pendingImageFile = null;
let initialEventSelected = false;

// --- Active listener unsubscribe functions ---
let unsubEvents = null;
let unsubBookings = null;
let unsubKitchen = null;

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
        subscribeToEvents();
    } else {
        loginScreen.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        // Clean up listeners on logout
        if (unsubEvents) { unsubEvents(); unsubEvents = null; }
        if (unsubBookings) { unsubBookings(); unsubBookings = null; }
        if (unsubKitchen) { unsubKitchen(); unsubKitchen = null; }
        initialEventSelected = false;
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
function openSidebar() {
    adminSidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
}
function closeSidebar() {
    adminSidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}
topbarMenuToggle.addEventListener('click', () => {
    if (adminSidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
});
if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// --- Navigation ---
document.querySelectorAll('.admin-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;

        document.querySelectorAll('.admin-nav a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${section}`).classList.add('active');

        closeSidebar();
    });
});

// ============================================
// REAL-TIME LISTENERS
// ============================================

// --- Subscribe to Events (real-time) ---
function subscribeToEvents() {
    if (unsubEvents) unsubEvents();

    const q = query(collection(db, 'events'), orderBy('date', 'desc'));

    unsubEvents = onSnapshot(q, (snapshot) => {
        allEvents = [];
        snapshot.forEach(d => {
            allEvents.push({ id: d.id, ...d.data() });
        });

        renderEventsTable();
        populateEventSelector();

        // Auto-select first upcoming event only on initial load
        if (!initialEventSelected && allEvents.length > 0) {
            initialEventSelected = true;
            const now = new Date();
            const upcoming = allEvents.find(e => e.date.toDate() >= now);
            const target = upcoming || allEvents[0];
            adminEventSelect.value = target.id;
            selectedEventId = target.id;
            subscribeToEventData(target.id);
        }
    }, (error) => {
        console.error('Error listening to events:', error);
        showToast('Errore nel caricamento degli eventi', 'error');
    });
}

// --- Subscribe to Bookings + Kitchen for an event ---
function subscribeToEventData(eventId) {
    subscribeToBookings(eventId);
    subscribeToKitchen(eventId);
}

function subscribeToBookings(eventId) {
    // Unsubscribe from previous listener
    if (unsubBookings) { unsubBookings(); unsubBookings = null; }

    if (!eventId) {
        currentBookings = [];
        noBookings.classList.remove('hidden');
        bookingsTableWrapper.classList.add('hidden');
        updateStats();
        return;
    }

    const q = query(
        collection(db, 'bookings'),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
    );

    unsubBookings = onSnapshot(q, (snapshot) => {
        currentBookings = [];
        snapshot.forEach(d => {
            currentBookings.push({ id: d.id, ...d.data() });
        });
        renderBookingsTable();
        updateStats();
    }, (error) => {
        console.error('Error listening to bookings:', error);
        showToast('Errore nel caricamento prenotazioni', 'error');
    });
}

function subscribeToKitchen(eventId) {
    // Unsubscribe from previous listener
    if (unsubKitchen) { unsubKitchen(); unsubKitchen = null; }

    if (!eventId) {
        currentKitchenStaff = [];
        kitchenList.innerHTML = '<div class="empty-state"><div class="empty-icon">&#127859;</div><p>Nessuno staff cucina</p></div>';
        kitchenCount.textContent = '';
        updateStats();
        return;
    }

    const q = query(
        collection(db, 'kitchenStaff'),
        where('eventId', '==', eventId)
    );

    unsubKitchen = onSnapshot(q, (snapshot) => {
        currentKitchenStaff = [];
        snapshot.forEach(d => {
            currentKitchenStaff.push({ id: d.id, ...d.data() });
        });
        renderKitchenStaff();
        updateStats();
    }, (error) => {
        console.error('Error listening to kitchen staff:', error);
    });
}

// --- Event Selector ---
function populateEventSelector() {
    const currentValue = adminEventSelect.value;
    let html = '<option value="">-- Seleziona evento --</option>';
    allEvents.forEach(e => {
        const dateStr = formatDate(e.date);
        html += `<option value="${e.id}">${escapeHtml(e.title)} - ${dateStr}</option>`;
    });
    adminEventSelect.innerHTML = html;
    // Preserve selection
    if (currentValue && allEvents.some(e => e.id === currentValue)) {
        adminEventSelect.value = currentValue;
    }
}

adminEventSelect.addEventListener('change', (e) => {
    selectedEventId = e.target.value;
    subscribeToEventData(selectedEventId);
});

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
            statusBadge = '<span class="badge" style="background:rgba(229,161,0,0.15);color:#B37A00;">Prenotazioni chiuse</span>';
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

// --- Event Image Upload ---
evImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pendingImageFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        evImagePreviewImg.src = ev.target.result;
        evImagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

evImageRemove.addEventListener('click', () => {
    pendingImageFile = null;
    evImageInput.value = '';
    evImageUrl.value = '';
    evImagePreview.classList.add('hidden');
    evImagePreviewImg.src = '';
});

async function uploadEventImage(eventId) {
    if (!pendingImageFile) return evImageUrl.value || null;

    const fileExt = pendingImageFile.name.split('.').pop();
    const storageRef = ref(storage, `events/${eventId}/locandina.${fileExt}`);

    const snapshot = await uploadBytes(storageRef, pendingImageFile);
    const url = await getDownloadURL(snapshot.ref);
    pendingImageFile = null;
    return url;
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

    const btnSave = document.getElementById('btnSaveEvent');
    btnSave.disabled = true;
    btnSave.textContent = 'Salvataggio...';

    try {
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

        let eventId = id;

        if (id) {
            const imageUrl = await uploadEventImage(id);
            if (imageUrl !== undefined && imageUrl !== null) {
                eventData.imageUrl = imageUrl;
            } else if (evImageUrl.value === '') {
                eventData.imageUrl = null;
            }
            await updateDoc(doc(db, 'events', id), eventData);
            showToast('Evento aggiornato!');
        } else {
            eventData.createdAt = Timestamp.now();
            const docRef = await addDoc(collection(db, 'events'), eventData);
            eventId = docRef.id;
            const imageUrl = await uploadEventImage(eventId);
            if (imageUrl) {
                await updateDoc(doc(db, 'events', eventId), { imageUrl });
            }
            showToast('Evento creato!');
        }

        eventFormWrapper.classList.add('hidden');
        // No need to reload - onSnapshot handles it
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Errore nel salvataggio dell\'evento', 'error');
    }

    btnSave.disabled = false;
    btnSave.textContent = 'Salva Evento';
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
    evImageInput.value = '';
    evImageUrl.value = '';
    evImagePreview.classList.add('hidden');
    evImagePreviewImg.src = '';
    pendingImageFile = null;
}

// --- Bookings Table ---
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
            <td>${escapeHtml(b.phone || '-')}</td>
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
        // No need to reload - onSnapshot handles it
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

    if (!bookingData.name) {
        showToast('Il nome è obbligatorio', 'warning');
        return;
    }

    try {
        await addDoc(collection(db, 'bookings'), bookingData);
        addBookingModal.classList.remove('active');
        showToast('Prenotazione aggiunta!');
        // No need to reload - onSnapshot handles it
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
        // No need to reload - onSnapshot handles it
    } catch (error) {
        console.error('Error deleting booking:', error);
        showToast('Errore nell\'eliminazione', 'error');
    }
}

// --- Delete Event ---
async function deleteEvent(eventId) {
    if (!confirm('Sei sicuro di voler eliminare questo evento? Verranno eliminate anche tutte le prenotazioni associate.')) return;

    try {
        const bookingsQ = query(collection(db, 'bookings'), where('eventId', '==', eventId));
        const bookingsSnap = await getDocs(bookingsQ);
        const deletePromises = [];
        bookingsSnap.forEach(d => {
            deletePromises.push(deleteDoc(doc(db, 'bookings', d.id)));
        });

        const kitchenQ = query(collection(db, 'kitchenStaff'), where('eventId', '==', eventId));
        const kitchenSnap = await getDocs(kitchenQ);
        kitchenSnap.forEach(d => {
            deletePromises.push(deleteDoc(doc(db, 'kitchenStaff', d.id)));
        });

        deletePromises.push(deleteDoc(doc(db, 'events', eventId)));

        await Promise.all(deletePromises);
        showToast('Evento eliminato');

        // If the deleted event was selected, clear selection
        if (selectedEventId === eventId) {
            selectedEventId = '';
            adminEventSelect.value = '';
            subscribeToEventData('');
        }
        // No need to reload events - onSnapshot handles it
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Errore nell\'eliminazione dell\'evento', 'error');
    }
}

// --- Edit Event ---
function editEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

    document.querySelectorAll('.admin-nav a').forEach(l => l.classList.remove('active'));
    document.querySelector('.admin-nav a[data-section="events"]').classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-events').classList.add('active');

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

    // Image
    pendingImageFile = null;
    evImageInput.value = '';
    if (event.imageUrl) {
        evImageUrl.value = event.imageUrl;
        evImagePreviewImg.src = event.imageUrl;
        evImagePreview.classList.remove('hidden');
    } else {
        evImageUrl.value = '';
        evImagePreview.classList.add('hidden');
    }

    eventFormWrapper.classList.remove('hidden');
    eventFormWrapper.scrollIntoView({ behavior: 'smooth' });
}

// --- Kitchen Staff ---
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
        // No need to reload - onSnapshot handles it
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
        // No need to reload - onSnapshot handles it
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
    const staffCount = currentKitchenStaff.length;
    const grandTotal = totalPeople + staffCount;

    statTotalPeople.textContent = totalPeople;
    statTotalBookings.textContent = confirmedBookings.length;
    statEating.textContent = totalEating;
    statNotEating.textContent = totalNotEating;
    statChildren.textContent = totalChildren;
    statKitchen.textContent = staffCount;
    statGrandTotal.textContent = grandTotal;
    statSeats.textContent = totalEating;

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

// --- Print Attendance List ---
btnPrintList.addEventListener('click', () => {
    if (!selectedEventId) {
        showToast('Seleziona prima un evento', 'warning');
        return;
    }

    const event = allEvents.find(e => e.id === selectedEventId);
    if (!event) return;

    const confirmedBookings = currentBookings.filter(b => b.status !== 'cancelled');

    const totalPeople = confirmedBookings.reduce((sum, b) => sum + (b.totalPeople || (b.adults || 0) + (b.children || 0)), 0);
    const totalEating = confirmedBookings.reduce((sum, b) => sum + (b.eating || 0), 0);
    const totalNotEating = confirmedBookings.reduce((sum, b) => sum + (b.notEating || 0), 0);
    const totalChildren = confirmedBookings.reduce((sum, b) => sum + (b.children || 0), 0);
    const totalAdults = confirmedBookings.reduce((sum, b) => sum + (b.adults || 0), 0);

    let rows = '';
    confirmedBookings.forEach((b, i) => {
        rows += `
        <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${escapeHtml(b.name)}</strong></td>
            <td style="text-align:center;">${(b.adults || 0) + (b.children || 0)}</td>
            <td style="text-align:center;">${b.adults || 0}</td>
            <td style="text-align:center;">${b.children || 0}</td>
            <td style="text-align:center;">${b.eating || 0}</td>
            <td style="text-align:center;">${b.isMember ? 'SI' : 'NO'}</td>
            <td style="font-size:11px;">${escapeHtml(b.allergies || '')}</td>
            <td style="text-align:center; width:55px;">&#9744;</td>
            <td style="text-align:center; width:55px;">&#9744;</td>
        </tr>`;
    });

    let kitchenRows = '';
    currentKitchenStaff.forEach(s => {
        kitchenRows += `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.role || '-')}</td></tr>`;
    });

    const printHtml = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Lista Presenze - ${escapeHtml(event.title)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; padding: 20px; color: #222; }
        h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 14px; text-align: center; color: #555; margin-bottom: 2px; font-weight: normal; }
        .info { text-align: center; margin-bottom: 16px; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
        th { background: #f0f0f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; margin: 16px 0; }
        .summary-item { text-align: center; }
        .summary-item .num { font-size: 22px; font-weight: bold; }
        .summary-item .label { font-size: 10px; text-transform: uppercase; color: #666; }
        .kitchen-section { margin-top: 20px; }
        .kitchen-section h3 { font-size: 14px; margin-bottom: 8px; }
        .print-btn { position: fixed; top: 10px; right: 10px; background: #1C1C1E; color: #fff; border: none; padding: 10px 24px; font-size: 14px; cursor: pointer; border-radius: 50px; }
        @media print { .print-btn { display: none; } }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">Stampa</button>
    <h1>CONTRADA SAN MAGNO</h1>
    <h2>${escapeHtml(event.title)}</h2>
    <p class="info">${formatDateTime(event.date)} &mdash; ${escapeHtml(event.location || '')}</p>

    <div class="summary">
        <div class="summary-item"><div class="num">${confirmedBookings.length}</div><div class="label">Prenotazioni</div></div>
        <div class="summary-item"><div class="num">${totalPeople}</div><div class="label">Persone</div></div>
        <div class="summary-item"><div class="num">${totalAdults}</div><div class="label">Adulti</div></div>
        <div class="summary-item"><div class="num">${totalChildren}</div><div class="label">Bambini</div></div>
        <div class="summary-item"><div class="num">${totalEating}</div><div class="label">Mangiano</div></div>
        <div class="summary-item"><div class="num">${totalNotEating}</div><div class="label">Non Mangiano</div></div>
        <div class="summary-item"><div class="num">${currentKitchenStaff.length}</div><div class="label">Staff Cucina</div></div>
        <div class="summary-item"><div class="num" style="color:#D4382C;">${totalPeople + currentKitchenStaff.length}</div><div class="label"><strong>Totale Presenti</strong></div></div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:30px;">#</th>
                <th>Nome</th>
                <th style="width:40px;">Tot</th>
                <th style="width:45px;">Adulti</th>
                <th style="width:50px;">Bambini</th>
                <th style="width:50px;">Mangia</th>
                <th style="width:40px;">Tess.</th>
                <th>Allergie</th>
                <th style="width:55px;">Entrato</th>
                <th style="width:55px;">Pagato</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>

    ${currentKitchenStaff.length > 0 ? `
    <div class="kitchen-section">
        <h3>Staff Cucina (${currentKitchenStaff.length})</h3>
        <table>
            <thead><tr><th>Nome</th><th>Ruolo</th></tr></thead>
            <tbody>${kitchenRows}</tbody>
        </table>
    </div>` : ''}
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
});

// --- Expose functions to global scope ---
window.adminApp = {
    editEvent,
    deleteEvent,
    editBooking: openEditBookingModal,
    deleteBooking,
    deleteStaff
};
