  // Get DOM elements
        const balance = document.getElementById('net-balance');
        const incomeDisplay = document.getElementById('total-income');
        const expenseDisplay = document.getElementById('total-expenses');
        const list = document.getElementById('list');
        const form = document.getElementById('transaction-form');
        const descriptionInput = document.getElementById('description');
        const amountInput = document.getElementById('amount');
        const addTransactionBtn = document.getElementById('add-transaction-btn');
        const resetFormBtn = document.getElementById('reset-form-btn');
        const formTitle = document.getElementById('form-title');
        const clearHistoryBtn = document.getElementById('clear-history-btn');

        const filterRadios = document.querySelectorAll('input[name="filter"]');
        const transactionTypeRadios = document.querySelectorAll('input[name="transaction-type"]');
        const noEntriesMessage = document.getElementById('no-entries-message');

        // Message overlay elements for History Card
        const transactionMessageOverlay = document.getElementById('transaction-message-overlay');
        const transactionMessageText = document.getElementById('transaction-message-text');

        // Message overlay elements for Form Card (for validation messages)
        const formMessageOverlay = document.getElementById('form-message-overlay');
        const formMessageText = document.getElementById('form-message-text');

        // Delete Confirmation Overlay elements
        const deleteConfirmationOverlay = document.getElementById('delete-confirmation-overlay');
        const confirmDeleteYesBtn = document.getElementById('confirm-delete-yes');
        const confirmDeleteNoBtn = document.getElementById('confirm-delete-no');

        // Clear History Confirmation Overlay elements
        const clearHistoryConfirmationOverlay = document.getElementById('clear-history-confirmation-overlay');
        const confirmClearHistoryYesBtn = document.getElementById('confirm-clear-history-yes');
        const confirmClearHistoryNoBtn = document.getElementById('confirm-clear-history-no');


        let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        let editingId = null; // To store the ID of the transaction being edited
        let transactionIdToDelete = null; // To store the ID of the transaction to be deleted

        // Function to format currency
        const formatCurrency = (amount) => {
            return amount.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
            });
        };

        // Function to update the balance summary
        function updateBalanceSummary() {
            const totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const totalExpenses = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const netBalance = totalIncome - totalExpenses;

            balance.innerText = formatCurrency(netBalance);
            incomeDisplay.innerText = formatCurrency(totalIncome);
            expenseDisplay.innerText = formatCurrency(totalExpenses);
        }

        // Function to add a transaction to the DOM
        function addTransactionDOM(transaction) {
            const sign = transaction.amount < 0 ? '-' : '+';
            const item = document.createElement('li');

            item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');
            item.setAttribute('data-id', transaction.id);

            item.innerHTML = `
                <p class="description">${transaction.description}</p>
                <span class="amount-display">${sign}${formatCurrency(Math.abs(transaction.amount))}</span>
                <div class="transaction-actions">
                    <button class="edit-btn" onclick="editTransaction(${transaction.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="showDeleteConfirmation(${transaction.id})"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;

            list.appendChild(item);
        }

        // Function to filter and display transactions
        function displayTransactions() {
            list.innerHTML = ''; // Clear current list

            const selectedFilter = document.querySelector('input[name="filter"]:checked').value;

            const filteredTransactions = transactions.filter(transaction => {
                if (selectedFilter === 'all') {
                    return true;
                }
                return transaction.type === selectedFilter;
            });

            if (filteredTransactions.length === 0) {
                noEntriesMessage.classList.remove('hidden');
            } else {
                noEntriesMessage.classList.add('hidden');
                filteredTransactions.forEach(addTransactionDOM);
            }
            updateBalanceSummary();
        }

        // Function to show a message overlay (reusable)
        function showMessageOverlay(overlayElement, textElement, message, duration = 2000, isError = false) {
            textElement.textContent = message;
            // Change background color for error messages
            if (isError) {
                overlayElement.querySelector('.message-content').classList.remove('bg-blue-500');
                overlayElement.querySelector('.message-content').classList.add('bg-red-500');
            } else {
                overlayElement.querySelector('.message-content').classList.remove('bg-red-500');
                overlayElement.querySelector('.message-content').classList.add('bg-blue-500');
            }

            overlayElement.classList.remove('hidden');
            console.log(`Overlay shown: ${message}`);

            // Hide after duration if it's not a confirmation overlay
            if (overlayElement !== deleteConfirmationOverlay && overlayElement !== clearHistoryConfirmationOverlay) {
                setTimeout(() => {
                    overlayElement.classList.add('hidden');
                    console.log(`Overlay hidden: ${message}`);
                }, duration);
            }
        }

        // Function to show delete confirmation overlay
        function showDeleteConfirmation(id) {
            transactionIdToDelete = id; // Store the ID
            showMessageOverlay(deleteConfirmationOverlay, deleteConfirmationOverlay.querySelector('p'), 'Are you sure you want to delete this entry?');
        }

        // Handler for "Yes" on delete confirmation
        function confirmDeleteYes() {
            if (transactionIdToDelete !== null) {
                performDeleteTransaction(transactionIdToDelete);
                transactionIdToDelete = null; // Reset
            }
            deleteConfirmationOverlay.classList.add('hidden'); // Hide confirmation overlay
        }

        // Handler for "No" on delete confirmation
        function confirmDeleteNo() {
            transactionIdToDelete = null; // Reset
            deleteConfirmationOverlay.classList.add('hidden'); // Hide confirmation overlay
            console.log('Deletion cancelled by user via overlay.');
        }

        // Actual delete logic (separated for clarity)
        function performDeleteTransaction(id) {
            console.log('Performing delete for transaction with ID:', id);
            const initialLength = transactions.length;
            
            transactions = transactions.filter(transaction => transaction.id !== Number(id));
            
            console.log('Transactions after filter:', transactions);
            console.log(`Number of transactions before: ${initialLength}, after: ${transactions.length}`);

            updateLocalStorage();
            displayTransactions();
            resetFormFields();
            showMessageOverlay(transactionMessageOverlay, transactionMessageText, 'Transaction deleted successfully!');
        }

        // Function to add/update transaction
        function addOrUpdateTransaction(e) {
            e.preventDefault();

            // Validate description and amount
            if (descriptionInput.value.trim() === '' || amountInput.value.trim() === '') {
                showMessageOverlay(formMessageOverlay, formMessageText, 'Please add a description and amount', 2000, true);
                return;
            }

            // Parse amount from text input
            const amount = parseFloat(amountInput.value);

            // Basic numeric validation for amount after parsing
            if (isNaN(amount) || !isFinite(amount)) {
                showMessageOverlay(formMessageOverlay, formMessageText, 'Invalid amount. Please enter a valid number.', 2000, true);
                return;
            }


            const transactionType = document.querySelector('input[name="transaction-type"]:checked').value;

            let finalAmount = amount;
            if (transactionType === 'expense' && amount > 0) {
                finalAmount = -amount;
            } else if (transactionType === 'income' && amount < 0) {
                finalAmount = Math.abs(amount);
            }

            let message = '';
            if (editingId !== null) {
                // Update existing transaction
                transactions = transactions.map(transaction =>
                    transaction.id === editingId
                        ? { ...transaction, description: descriptionInput.value.trim(), amount: finalAmount, type: transactionType }
                        : transaction
                );
                editingId = null;
                addTransactionBtn.textContent = 'Add Transaction';
                formTitle.textContent = 'New Transactions';
                message = 'Transaction updated successfully!';
            } else {
                // Add new transaction
                const newTransaction = {
                    id: generateID(),
                    description: descriptionInput.value.trim(),
                    amount: finalAmount,
                    type: transactionType
                };
                transactions.push(newTransaction);
                message = 'Transaction added successfully!';
            }

            updateLocalStorage();
            displayTransactions();
            resetFormFields();

            showMessageOverlay(transactionMessageOverlay, transactionMessageText, message);
        }

        // Generate random ID
        function generateID() {
            return Math.floor(Math.random() * 100000000);
        }

        // Function to show clear history confirmation
        function showClearHistoryConfirmation() {
            showMessageOverlay(clearHistoryConfirmationOverlay, clearHistoryConfirmationOverlay.querySelector('p'), 'Are you sure you want to clear all history? This action cannot be undone.');
        }

        // Handler for "Yes" on clear history confirmation
        function confirmClearHistoryYes() {
            performClearHistory();
            clearHistoryConfirmationOverlay.classList.add('hidden'); // Hide confirmation overlay
        }

        // Handler for "No" on clear history confirmation
        function confirmClearHistoryNo() {
            clearHistoryConfirmationOverlay.classList.add('hidden'); // Hide confirmation overlay
            console.log('Clear history cancelled by user via overlay.');
        }

        // Actual clear all transactions logic (separated for clarity)
        function performClearHistory() {
            transactions = []; // Empty the transactions array
            updateLocalStorage(); // Save the empty array to local storage
            displayTransactions(); // Re-render to show empty list
            updateBalanceSummary(); // Reset summary to $0.00
            resetFormFields(); // Clear form fields
            showMessageOverlay(transactionMessageOverlay, transactionMessageText, 'All history cleared!');
        }

        // Edit transaction
        function editTransaction(id) {
            const transactionToEdit = transactions.find(transaction => transaction.id === id);

            if (transactionToEdit) {
                descriptionInput.value = transactionToEdit.description;
                amountInput.value = Math.abs(transactionToEdit.amount);

                document.querySelector(`input[name="transaction-type"][value="${transactionToEdit.type}"]`).checked = true;

                editingId = id;
                addTransactionBtn.textContent = 'Update Transaction';
                formTitle.textContent = 'Edit Transaction';
            }
        }

        // Reset form fields
        function resetFormFields() {
            console.log('Reset button clicked, resetting form...');
            descriptionInput.value = '';
            amountInput.value = '';
            document.querySelector('input[name="transaction-type"][value="income"]').checked = true;
            editingId = null;
            addTransactionBtn.textContent = 'Add Transaction';
            formTitle.textContent = 'New Transactions';
        }

        // Update local storage transactions
        function updateLocalStorage() {
            localStorage.setItem('transactions', JSON.stringify(transactions));
        }

        // --- Input Validation for Amount Field ---
        amountInput.addEventListener('input', (event) => {
            // Allow numbers and a single decimal point
            const sanitizedValue = event.target.value.replace(/[^0-9.]/g, ''); // Remove non-numeric except dot
            const parts = sanitizedValue.split('.');
            if (parts.length > 2) {
                // If more than one dot, keep only the first dot and numbers after it
                event.target.value = parts[0] + '.' + parts.slice(1).join('');
            } else {
                event.target.value = sanitizedValue;
            }

            // Show error message if input is not a valid number (after sanitization)
            if (event.target.value !== '' && isNaN(parseFloat(event.target.value))) {
                showMessageOverlay(formMessageOverlay, formMessageText, 'Please enter numbers only for amount.', 2000, true);
            } else {
                // If valid, hide any previous error message
                formMessageOverlay.classList.add('hidden');
            }
        });


        // Initial app setup
        function init() {
            form.addEventListener('submit', addOrUpdateTransaction);
            resetFormBtn.addEventListener('click', resetFormFields);
            clearHistoryBtn.addEventListener('click', showClearHistoryConfirmation);

            filterRadios.forEach(radio => {
                radio.addEventListener('change', displayTransactions);
            });

            // Event listeners for delete confirmation buttons
            confirmDeleteYesBtn.addEventListener('click', confirmDeleteYes);
            confirmDeleteNoBtn.addEventListener('click', confirmDeleteNo);

            // Event listeners for clear history confirmation buttons
            confirmClearHistoryYesBtn.addEventListener('click', confirmClearHistoryYes);
            confirmClearHistoryNoBtn.addEventListener('click', confirmClearHistoryNo);

            loadTransactions();
        }

        document.addEventListener('DOMContentLoaded', init);

        function loadTransactions() {
            const storedTransactions = localStorage.getItem('transactions');
            if (storedTransactions) {
                transactions = JSON.parse(storedTransactions);
            } else {
                transactions = [];
            }
            displayTransactions();
            updateBalanceSummary();
        }