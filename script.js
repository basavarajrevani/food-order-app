// API functions
async function saveChatMessage(message, type) {
    try {
        await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, type })
        });
    } catch (error) {
        console.error('Error saving chat message:', error);
    }
}

async function saveOrder(orderData) {
    try {
        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error saving order:', error);
        throw error;
    }
}

// Chatbot logic
const messagesContainer = document.getElementById('chatbot-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Menu data
const menu = {
    'pizza': [
        {name: 'Margherita Pizza', price: 10.99},
        {name: 'Pepperoni Pizza', price: 12.99},
        {name: 'Vegetarian Pizza', price: 11.99},
        {name: 'BBQ Chicken Pizza', price: 13.99},
        {name: 'Hawaiian Pizza', price: 12.49}
    ],
    'burger': [
        {name: 'Classic Cheeseburger', price: 8.99},
        {name: 'Veggie Burger', price: 9.99},
        {name: 'Deluxe Burger', price: 12.99},
        {name: 'Bacon Burger', price: 11.99},
        {name: 'Mushroom Swiss Burger', price: 10.99}
    ],
    'salad': [
        {name: 'Caesar Salad', price: 7.99},
        {name: 'Greek Salad', price: 8.99},
        {name: 'Cobb Salad', price: 9.99},
        {name: 'Spinach Salad', price: 8.49},
        {name: 'Southwest Chicken Salad', price: 10.49}
    ],
    'beverages': [
        {name: 'Coca-Cola', price: 2.49},
        {name: 'Sprite', price: 2.49},
        {name: 'Iced Tea', price: 2.99},
        {name: 'Lemonade', price: 3.29},
        {name: 'Bottled Water', price: 1.99}
    ],
    'desserts': [
        {name: 'Chocolate Brownie', price: 4.99},
        {name: 'New York Cheesecake', price: 5.49},
        {name: 'Apple Pie', price: 4.79},
        {name: 'Ice Cream Sundae', price: 5.29},
        {name: 'Fruit Tart', price: 4.59}
    ]
};

// Chatbot states
let conversationState = 'greeting';
let selectedCategory = null;
let selectedItem = null;
let cart = [];
let deliveryAddress = null;

async function addMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.innerText = message;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Save message to database
    await saveChatMessage(message, type === 'bot-message' ? 'bot' : 'user');
}

async function botResponse(message) {
    await addMessage(message, 'bot-message');
}

async function handleUserInput(input) {
    input = input.toLowerCase().trim();
    await addMessage(input, 'user-message');

    switch(conversationState) {
        case 'greeting':
            if (input.includes('hi') || input.includes('hello')) {
                await botResponse('Welcome to NomNom Express! Would you like to see our menu categories? (pizza, burger, salad, beverages, desserts)');
                conversationState = 'select-category';
            } else {
                await botResponse('Hello! How can I help you today? Type "menu" to see our food options.');
            }
            break;

        case 'select-category':
            if (menu[input]) {
                selectedCategory = input;
                let menuList = menu[input].map((item, index) => 
                    `${index + 1}. ${item.name} - $${item.price.toFixed(2)}`
                ).join('\n');
                await botResponse(`Here are our ${input} options:\n${menuList}\n\nPlease select a number.`);
                conversationState = 'select-item';
            } else {
                await botResponse('Invalid category. Please choose pizza, burger, salad, beverages, or desserts.');
            }
            break;

        case 'select-item':
            let index = parseInt(input) - 1;
            if (index >= 0 && index < menu[selectedCategory].length) {
                selectedItem = menu[selectedCategory][index];
                await botResponse(`You selected ${selectedItem.name}. Quantity?`);
                conversationState = 'select-quantity';
            } else {
                await botResponse('Invalid selection. Please choose a number from the list.');
            }
            break;

        case 'select-quantity':
            let quantity = parseInt(input);
            if (quantity > 0) {
                cart.push({
                    ...selectedItem,
                    quantity: quantity
                });
                await botResponse(`Added ${quantity} ${selectedItem.name}(s) to your cart. Would you like to order more items? (yes/no)`);
                conversationState = 'continue-order';
            } else {
                await botResponse('Please enter a valid quantity (greater than 0).');
            }
            break;

        case 'continue-order':
            if (input === 'yes') {
                await botResponse('What category would you like to order from? (pizza, burger, salad, beverages, desserts)');
                conversationState = 'select-category';
            } else if (input === 'no') {
                let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                await botResponse(`Great! Your total is $${total.toFixed(2)}. Please provide your delivery address:`);
                conversationState = 'get-address';
            } else {
                await botResponse('Please answer with yes or no.');
            }
            break;

        case 'get-address':
            deliveryAddress = input;
            let orderTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            try {
                const order = await saveOrder({
                    items: cart,
                    totalAmount: orderTotal,
                    deliveryAddress: deliveryAddress,
                    status: 'pending'
                });

                await botResponse(`Thank you! Your order has been placed successfully!\nOrder ID: ${order._id}\nTotal Amount: $${orderTotal.toFixed(2)}\nDelivery Address: ${deliveryAddress}\n\nYour order will be delivered soon. Type "hi" to start a new order!`);
                
                // Reset the order
                cart = [];
                deliveryAddress = null;
                selectedCategory = null;
                selectedItem = null;
                conversationState = 'greeting';
            } catch (error) {
                await botResponse('Sorry, there was an error processing your order. Please try again.');
                conversationState = 'greeting';
            }
            break;
    }
}

// Event Listeners
sendBtn.addEventListener('click', () => {
    if (userInput.value.trim()) {
        handleUserInput(userInput.value);
        userInput.value = '';
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && userInput.value.trim()) {
        handleUserInput(userInput.value);
        userInput.value = '';
    }
});
