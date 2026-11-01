/**
 * Panxcz License Server — starter frontend helpers
 * Toast, modal, copy-to-clipboard, sidebar, live key preview
 * No dependencies. Drop into project/assets/app.js
 */

(function () {
  'use strict';

  // ---------- Toast ----------
  function ensureToastContainer() {
    var el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  window.showToast = function (message, type) {
    type = type || 'success';
    var container = ensureToastContainer();
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 3000);
  };

  // ---------- Copy to clipboard ----------
  window.copyText = function (text, successMsg) {
    successMsg = successMsg || 'Copied!';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(successMsg, 'success');
      }).catch(function () {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  };

  function fallbackCopy(text, successMsg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, 'success');
    } catch (e) {
      showToast('Copy failed', 'error');
    }
    document.body.removeChild(ta);
  }

  // ---------- Modal ----------
  window.openModal = function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  };
  window.closeModal = function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  };

  // Close modal on overlay click
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('modal-overlay')) {
      e.target.style.display = 'none';
    }
  });

  // ---------- Sidebar (mobile) ----------
  window.toggleSidebar = function () {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.querySelector('.overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  };

  // ---------- Live key preview ----------
  // Call updateKeyPreview(prefixInputId, patternInputId, previewElId)
  window.updateKeyPreview = function (prefixId, patternId, previewId) {
    var prefixEl = document.getElementById(prefixId);
    var patternEl = document.getElementById(patternId);
    var previewEl = document.getElementById(previewId);
    if (!prefixEl || !patternEl || !previewEl) return;

    function generatePreview() {
      var prefix = prefixEl.value || 'PAN';
      var pattern = patternEl.value || 'X8-X4-X4';
      var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      var nums = '0123456789';
      var letters = 'ABCDEFGHJKMNPQRSTUVWXYZ';
      var parts = pattern.split('-');
      var key = prefix;
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var len = parseInt(part.replace(/[^0-9]/g, ''), 10) || 4;
        var type = part.replace(/[0-9]/g, '');
        var pool = type === 'N' ? nums : (type === 'A' ? letters : chars);
        var random = '';
        for (var j = 0; j < len; j++) {
          random += pool.charAt(Math.floor(Math.random() * pool.length));
        }
        key += '-' + random;
      }
      previewEl.textContent = key;
    }

    prefixEl.addEventListener('input', generatePreview);
    patternEl.addEventListener('input', generatePreview);
    generatePreview();
  };

  // ---------- Confirm helpers ----------
  window.confirmAction = function (message, callback) {
    if (window.confirm(message)) {
      callback();
    }
  };

  // Triple confirm for dangerous actions (type "DELETE")
  window.confirmDelete = function (callback) {
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    if (!window.confirm('Really delete? Last chance.')) return;
    var typed = window.prompt('Type DELETE to confirm:');
    if (typed === 'DELETE') {
      callback();
    } else {
      showToast('Confirmation cancelled', 'warning');
    }
  };

  // ---------- Auto-refresh ----------
  var autoRefreshTimer = null;
  window.toggleAutoRefresh = function (url, intervalSec, enabled) {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    if (enabled) {
      autoRefreshTimer = setInterval(function () {
        window.location.reload();
      }, (intervalSec || 10) * 1000);
    }
  };

  // ---------- Search / filter helper ----------
  window.filterTable = function (inputId, tableId) {
    var input = document.getElementById(inputId);
    var table = document.getElementById(tableId);
    if (!input || !table) return;
    input.addEventListener('input', function () {
      var q = input.value.toLowerCase();
      var rows = table.querySelectorAll('tbody tr');
      for (var i = 0; i < rows.length; i++) {
        var text = rows[i].textContent.toLowerCase();
        rows[i].style.display = text.indexOf(q) !== -1 ? '' : 'none';
      }
    });
  };

})();
