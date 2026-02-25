const loginBtn = document.getElementById('login-btn')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')

loginBtn.addEventListener('click', async (event) => {
    event.preventDefault()

    const currentUsername = usernameInput.value;
    const currentPassword = passwordInput.value;

    if (!currentUsername || !currentPassword) {
        alert("Enter login and password!");
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/token/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUsername,
                password: currentPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('data_access', data.access)
            localStorage.setItem('data_refresh', data.refresh)

            await generateAndSaveKeys();
            await uploadPublicKey(data.access);
            connectToChat('testroom');

            console.log("Success! Server:", data);
            alert("Success");
        } else {
            console.error("Error:", data);
            alert("error");
        }

    } catch (error) {
        console.error("Network error", error);
        alert("Network error");
    }
})

async function generateAndSaveKeys() {
    if (localStorage.getItem('private_key')) {
        console.log("Keys already in browser");
        return;
    }


    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );

        const publicKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privateKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

        localStorage.setItem('public_key', JSON.stringify(publicKeyJWK));
        localStorage.setItem('private_key', JSON.stringify(privateKeyJWK));

        console.log("Keys successful saved");
        
    } catch (error) {
        console.error("Error while registrating keys:", error);
    }
}

async function uploadPublicKey(token) {
    const publicKey = localStorage.getItem('public_key');
    if (!publicKey) return;

    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    const userId = tokenPayload.user_id;

    console.log(`Наш ID користувача: ${userId}. Відправляємо ключ на сервер...`);

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/users/${userId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                public_key: publicKey
            })
        });

        if (response.ok) {
            console.log("Публічний ключ успішно збережено на сервері!");
        } else {
            console.error("Не вдалося зберегти ключ. Відповідь сервера:", await response.text());
        }

    } catch (error) {
        console.error("Помилка мережі при відправці ключа:", error);
    }
}

let chatSocket = null;

function connectToChat(roomName) {
    chatSocket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${roomName}/`);

    chatSocket.onopen = function(e) {
        console.log("WebSocket з'єднання встановлено!");
        document.getElementById('chat-log').value += ("=== Ви увійшли в чат ===\n");
    };

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const message = data.message;
        
        document.getElementById('chat-log').value += (message + '\n');
    };

    chatSocket.onclose = function(e) {
        console.error('WebSocket з\'єднання закрито несподівано');
    };
}

document.getElementById('chat-message-submit').addEventListener('click', function(e) {
    const messageInputDom = document.getElementById('chat-message-input');
    const messageText = messageInputDom.value;

    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            "message": messageText
        }));

        messageInputDom.value = '';
    } else {
        alert("З'єднання з чатом ще не встановлено!");
    }
});