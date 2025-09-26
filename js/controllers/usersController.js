// js/controllers/usersController.js
// Controller for users and personnel management

import { authModel } from '../models/storageModel.js';
import { renderUsers, renderUserForm } from '../views/userView.js';
import { showAlert, createModal, showModal } from '../utils/modalUtil.js';

/**
 * Initialize the users controller
 */
export function initUsersController() {
  console.log('Initializing users controller...');
  
  // Check access restrictions
  const currentUser = authModel.getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    // Only admins can access this section
    window.location.href = 'menu.html';
    return;
  }
  
  // Display username
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan && currentUser && currentUser.name) {
    userNameSpan.textContent = currentUser.name;
  }
  
  // Set up user menu
  setupUserMenu();
  
  // Set up sidebar navigation
  setupSidebarNavigation();
  
  // Load initial data
  loadUsersList();
}

/**
 * Set up user menu functionality
 */
function setupUserMenu() {
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (userIcon && userDropdown) {
    userIcon.onclick = function(e) {
      userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
      e.stopPropagation();
    };
    
    document.body.addEventListener('click', function() {
      userDropdown.style.display = 'none';
    });
  }
  
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      // Log the logout activity
      authModel.logActivity({
        action: 'logout',
        description: 'User logged out'
      });
      
      // Redirect to login page
      window.location.href = 'index.html';
    };
  }
}

/**
 * Set up sidebar navigation
 */
function setupSidebarNavigation() {
  const sidebarButtons = document.querySelectorAll('.sidebar-menu button');
  const sections = document.querySelectorAll('.form-section');
  const defaultSection = document.getElementById('default-section');
  
  sidebarButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetSection = this.getAttribute('data-section');
      console.log(`Selected section: ${targetSection}`);
      
      // Remove active class from all buttons
      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      
      // Hide default section
      if (defaultSection) {
        defaultSection.style.display = 'none';
      }
      
      // Hide all sections
      sections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
      });
      
      // Show selected section
      const activeSection = document.getElementById(`${targetSection}-section`);
      if (activeSection) {
        activeSection.classList.add('active');
        activeSection.style.display = 'block';
        
        // Load specific content based on section
        if (targetSection === 'staff') {
          loadUsersList();
        } else if (targetSection === 'new-user') {
          setupNewUserForm();
        }
      }
    });
  });
  
  // Activate staff list by default
  const staffBtn = document.querySelector('[data-section="staff"]');
  if (staffBtn) {
    staffBtn.click();
  }
}

/**
 * Load the list of users/staff
 */
function loadUsersList() {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  // Get users data
  const users = authModel.getUsers();
  
  // Render users
  renderUsers(users, usersList);
  
  // Set up user actions
  setupUserActions();
}

/**
 * Set up the new user form
 */
function setupNewUserForm() {
  const formContainer = document.getElementById('newUserFormContainer');
  if (!formContainer) return;
  
  // Render the form
  renderUserForm(null, formContainer);
  
  // Set up form submission
  const userForm = document.getElementById('userForm');
  if (userForm) {
    userForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(userForm);
      const userData = Object.fromEntries(formData.entries());
      
      // Check if user ID already exists
      const users = authModel.getUsers();
      const existingUser = users.find(u => u.id === userData.id);
      
      if (existingUser) {
        showAlert('error', 'A user with this ID already exists');
        return;
      }
      
      // Add user
      authModel.addUser(userData);
      
      // Log activity
      authModel.logActivity({
        action: 'create',
        description: `Added new user: ${userData.name} (${userData.role})`
      });
      
      // Reset form
      userForm.reset();
      
      // Show success message
      showAlert('success', 'User added successfully');
      
      // Redirect to users list after a delay
      setTimeout(() => {
        const staffBtn = document.querySelector('[data-section="staff"]');
        if (staffBtn) {
          staffBtn.click();
        }
      }, 1500);
    });
  }
}

/**
 * Set up actions for user items (edit, delete)
 */
function setupUserActions() {
  // Edit user buttons
  const editButtons = document.querySelectorAll('.edit-user');
  editButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const userId = this.getAttribute('data-id');
      if (!userId) return;
      
      // Get user data
      const users = authModel.getUsers();
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        showAlert('error', 'User not found');
        return;
      }
      
      // Create edit modal
      createEditUserModal(user);
    });
  });
  
  // Delete user buttons
  const deleteButtons = document.querySelectorAll('.delete-user');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const userId = this.getAttribute('data-id');
      if (!userId) return;
      
      // Check if this is the current user
      const currentUser = authModel.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        showAlert('error', 'You cannot delete your own account');
        return;
      }
      
      // Ask for confirmation
      if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        // Delete user
        authModel.deleteUser(userId);
        
        // Log activity
        authModel.logActivity({
          action: 'delete',
          description: `Deleted user with ID: ${userId}`
        });
        
        // Reload users list
        loadUsersList();
        
        // Show success message
        showAlert('success', 'User deleted successfully');
      }
    });
  });
}

/**
 * Create a modal for editing user data
 */
function createEditUserModal(user) {
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.id = 'editUserModal';
  modalContainer.style.cssText = 'display:flex; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:1000; justify-content:center; align-items:center;';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = 'background:white; padding:30px; border-radius:15px; min-width:350px; max-width:500px; box-shadow:0 5px 25px rgba(0,0,0,0.2);';
  
  // Add title
  const title = document.createElement('h3');
  title.textContent = 'Edit User';
  title.style.cssText = 'margin-bottom:20px; color:#1f2937; text-align:center;';
  
  // Create form container
  const formContainer = document.createElement('div');
  
  // Render user form with user data
  renderUserForm(user, formContainer);
  
  // Add buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display:flex; justify-content:space-between; margin-top:20px;';
  
  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = 'padding:10px 20px; border:none; background:#e5e7eb; color:#1f2937; border-radius:5px; cursor:pointer;';
  cancelButton.onclick = () => {
    document.body.removeChild(modalContainer);
  };
  
  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Changes';
  saveButton.style.cssText = 'padding:10px 20px; border:none; background:#2563eb; color:white; border-radius:5px; cursor:pointer;';
  saveButton.onclick = () => {
    const form = document.getElementById('userForm');
    if (form) {
      const formData = new FormData(form);
      const userData = Object.fromEntries(formData.entries());
      
      // Ensure ID is preserved
      userData.id = user.id;
      
      // Update user
      authModel.updateUser(userData);
      
      // Log activity
      authModel.logActivity({
        action: 'update',
        description: `Updated user: ${userData.name} (${userData.role})`
      });
      
      // Close modal
      document.body.removeChild(modalContainer);
      
      // Reload users list
      loadUsersList();
      
      // Show success message
      showAlert('success', 'User updated successfully');
    }
  };
  
  // Add buttons to container
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(saveButton);
  
  // Assemble modal
  modalContent.appendChild(title);
  modalContent.appendChild(formContainer);
  modalContent.appendChild(buttonContainer);
  modalContainer.appendChild(modalContent);
  
  // Add modal to body
  document.body.appendChild(modalContainer);
  
  // Close modal when clicking outside
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      document.body.removeChild(modalContainer);
    }
  });
}