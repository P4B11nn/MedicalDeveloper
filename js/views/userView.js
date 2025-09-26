// js/views/userView.js
// View for user management interface
import { authModel } from '../models/storageModel.js';

/**
 * Shows a custom confirmation dialog
 * @param {string} title - Title of the confirmation dialog
 * @param {string} message - Message to display
 * @param {Function} callback - Function to execute when confirmed
 */
function showConfirmation(title, message, callback = null) {
  const confirmationModal = document.getElementById('modalConfirmacion');
  const confirmationTitle = document.getElementById('tituloConfirmacion');
  const confirmationMessage = document.getElementById('mensajeConfirmacion');
  const confirmButton = document.getElementById('btnAceptarConfirmacion');
  
  confirmationTitle.textContent = title;
  confirmationMessage.textContent = message;
  
  // Configure confirmation button
  confirmButton.onclick = () => {
    confirmationModal.style.display = 'none';
    if (callback && typeof callback === 'function') {
      callback();
    }
  };
  
  // Show the modal
  confirmationModal.style.display = 'flex';
}

/**
 * Renders the list of users in the UI
 */
export function renderUserList() {
  const users = authModel.getUsers();
  const staffList = document.getElementById('personalLista');
  
  if (!staffList) return;
  
  staffList.innerHTML = '';
  
  if (users.length === 0) {
    staffList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No users registered</div>';
    return;
  }
  
  users.forEach((user, i) => {
    // Support both Spanish and English field names
    const name = user.nombre || user.name || '';
    const lastName = user.apellidos || user.lastName || '';
    const role = user.rol || user.role || '';
    const matricula = user.matricula || user.registrationNumber || '';
    const mesa = user.mesa || user.desk || '';
    
    const roleLabel = role === 'admin' ? 'Administrator' : 'Intern';
    const roleIcon = role === 'admin' ? '👑' : '👤';
    
    const staffItem = document.createElement('div');
    staffItem.className = 'personal-item';
    staffItem.innerHTML = `
      <h4>${roleIcon} ${name} ${lastName}</h4>
      <p><strong>ID:</strong> ${user.id || ''}</p>
      <p><strong>Registration:</strong> ${matricula}</p>
      <p><strong>Desk:</strong> ${mesa}</p>
      <p><strong>Role:</strong> ${roleLabel}</p>
      <div class="personal-buttons">
        <button data-index="${i}" class="editarUsuario">Edit</button>
        <button data-index="${i}" class="eliminarUsuario">Delete</button>
      </div>
    `;
    
    staffList.appendChild(staffItem);
  });
  
  // Set up event listeners for buttons
  setupStaffEvents();
}

/**
 * Sets up event listeners for staff management
 */
function setupStaffEvents() {
  const staffList = document.getElementById('personalLista');
  const staffModal = document.getElementById('modalPersonal');
  const closeStaffButton = document.getElementById('cerrarPersonal');
  
  if (closeStaffButton) {
    closeStaffButton.addEventListener('click', () => {
      staffModal.style.display = 'none';
    });
  }
  
  if (staffList) {
    staffList.addEventListener('click', (e) => {
      if (e.target.classList.contains('eliminarUsuario')) {
        const userIndex = e.target.getAttribute('data-index');
        showConfirmation('Delete User', 'Are you sure you want to delete this user?', () => {
          authModel.deleteUser(userIndex);
          renderUserList();
        });
      } else if (e.target.classList.contains('editarUsuario')) {
        const userIndex = e.target.getAttribute('data-index');
        openEditUserForm(userIndex);
      }
    });
  }
  
  // Close modal when clicking outside
  if (staffModal) {
    staffModal.addEventListener('click', function(e) {
      if (e.target === staffModal) {
        staffModal.style.display = 'none';
      }
    });
  }
}

/**
 * Sets up the user form for creating and editing users
 */
export function setupUserForm() {
    const userForm = document.getElementById('formUsuario');
    const userModal = document.getElementById('modalUsuario');
    
    if (!userForm || !userModal) return;
    
    // Handle form submission
    userForm.onsubmit = function(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(userForm).entries());
      const userIndex = userForm.querySelector('#editIndex').value;
      
      let success = false;
      let message = '';
      
      if (userIndex !== null && userIndex !== "" && userIndex !== undefined) {
        // Edit mode
        success = authModel.updateUser(userIndex, data);
        message = 'User updated successfully';
      } else {
        // Creation mode
        success = authModel.addUser(data);
        message = 'User registered successfully';
      }
      
      if (success) {
        userModal.style.display = 'none';
        userForm.reset();
        userForm.querySelector('#editIndex').value = '';
        showConfirmation('Success!', message, () => {
          renderUserList();
        });
      }
    };

    // Handle cancel button
    const cancelUserButton = document.getElementById('cancelarUsuario');
    if (cancelUserButton) {
      cancelUserButton.onclick = function(e) {
        e.preventDefault();
        userModal.style.display = 'none';
        userForm.reset();
        userForm.querySelector('#editIndex').value = '';
      };
    }

    // Handle close button (X)
    const closeUserButton = document.getElementById('cerrarUsuario');
    if (closeUserButton) {
      closeUserButton.onclick = function() {
        userModal.style.display = 'none';
        userForm.reset();
        userForm.querySelector('#editIndex').value = '';
      };
    }
    
    // Close modal when clicking outside
    userModal.addEventListener('click', function(e) {
      if (e.target === userModal) {
        userModal.style.display = 'none';
        userForm.reset();
        userForm.querySelector('#editIndex').value = '';
      }
    });
}

/**
 * Opens the user form in edit mode with user data
 * @param {number} userIndex - Index of the user in the users array
 */
export function openEditUserForm(userIndex) {
    const userForm = document.getElementById('formUsuario');
    const userModal = document.getElementById('modalUsuario');
    const modalTitle = document.querySelector('#modalUsuario h3');
    const submitButton = userForm.querySelector('button[type="submit"]');
    
    const user = authModel.getUserByIndex(userIndex);
    if (!user) return;
    
    // Update title and button
    if (modalTitle) modalTitle.textContent = 'Edit User';
    if (submitButton) submitButton.textContent = 'Save Changes';
    
    // Set edit index
    userForm.querySelector('#editIndex').value = userIndex;
    
    // Fill form with user data
    for (const key in user) {
        const input = userForm.elements[key];
        if (input) {
            input.value = user[key];
        }
    }
    
    // Show modal
    userModal.style.display = 'flex';
}

/**
 * Reset form for new user creation
 */
export function resetFormForNewUser() {
    const userForm = document.getElementById('formUsuario');
    const userModal = document.getElementById('modalUsuario');
    const modalTitle = document.querySelector('#modalUsuario h3');
    const submitButton = userForm.querySelector('button[type="submit"]');
    
    if (modalTitle) modalTitle.textContent = 'New User';
    if (submitButton) submitButton.textContent = 'Register';
    
    userForm.reset();
    userForm.querySelector('#editIndex').value = '';
    
    // Make sure all fields are enabled
    userForm.querySelectorAll('input, select').forEach(input => {
        input.disabled = false;
    });
    
    // Show modal
    if (userModal) userModal.style.display = 'flex';
}