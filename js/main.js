// js/main.js
// Main entry point for the application

import { initAuthController } from './controllers/authController.js';
import { initMenuController } from './controllers/menuController.js';
import { authModel } from './models/storageModel.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Medical Developer Application Starting...');
  
  // Determine current page based on the file name
  const currentPage = window.location.pathname.split('/').pop();
  console.log('Current page:', currentPage);
  
  // Verificar usuarios de prueba
  console.log('Usuarios en sistema:', authModel.getUsers());
  
  // Initialize controllers based on the current page
  if (currentPage === 'index.html' || !currentPage) {
    console.log('Initializing Auth Controller for login page...');
    initAuthController();
  } else if (currentPage === 'menu.html') {
    console.log('Initializing Menu Controller for menu page...');
    initMenuController();
  } else {
    console.log('No specific controller for this page.');
    // Generic check for authentication on other pages
    const currentUser = authModel.getCurrentUser();
    if (!currentUser) {
      console.log('User not authenticated, redirecting to login.');
      window.location.href = 'index.html';
    }
  }
  
  // Para depuración - Verificar usuario actual
  const currentUser = authModel.getCurrentUser();
  console.log('Usuario actual al final de main.js:', currentUser);
});