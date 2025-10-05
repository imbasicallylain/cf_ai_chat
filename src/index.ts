export interface Env {
	AI: any;
	MY_DURABLE_OBJECT: DurableObjectNamespace;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// serve chat UI
		if (url.pathname === '/' && request.method === 'GET') {
			return new Response(chatHTML, {
				headers: { 'Content-Type': 'text/html' }
			});
		}

		// handle incoming messages
		if (url.pathname === '/chat' && request.method === 'POST') {
			const data = await request.json();
			const sid = data.sessionId || 'default';
			
			const objId = env.MY_DURABLE_OBJECT.idFromName(sid);
			const chatObj = env.MY_DURABLE_OBJECT.get(objId);
			
			// need to reconstruct request since body is already consumed
			const newReq = new Request(request.url, {
				method: 'POST',
				headers: request.headers,
				body: JSON.stringify(data)
			});
			
			return chatObj.fetch(newReq);
		}

		// reset conversation
		if (url.pathname === '/clear' && request.method === 'POST') {
			const data = await request.json();
			const sid = data.sessionId || 'default';
			
			const objId = env.MY_DURABLE_OBJECT.idFromName(sid);
			const chatObj = env.MY_DURABLE_OBJECT.get(objId);
			
			const newReq = new Request(request.url, {
				method: 'POST',
				headers: request.headers,
				body: JSON.stringify(data)
			});
			
			return chatObj.fetch(newReq);
		}

		return new Response('Not found', { status: 404 });
	}
};

// each user session gets its own durable object instance
// this keeps conversation history isolated and persistent
export class MyDurableObject {
	private chatHistory: Array<{ role: string; content: string }> = [];
	private hasLoadedFromStorage = false;

	constructor(private state: DurableObjectState, private env: Env) {}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/clear') {
			this.chatHistory = [];
			await this.state.storage.deleteAll();
			return Response.json({ success: true });
		}

		// lazy load history on first message
		if (!this.hasLoadedFromStorage) {
			const saved = await this.state.storage.get<Array<{ role: string; content: string }>>('history');
			if (saved) {
				this.chatHistory = saved;
			}
			this.hasLoadedFromStorage = true;
		}

		const { message } = await request.json();

		this.chatHistory.push({ role: 'user', content: message });

		// send full conversation context to AI
		const aiResponse = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
			messages: this.chatHistory
		});

		const reply = aiResponse.response;
		this.chatHistory.push({ role: 'assistant', content: reply });

		// persist after each exchange
		await this.state.storage.put('history', this.chatHistory);

		return Response.json({ 
			response: reply,
			history: this.chatHistory 
		});
	}
}

const chatHTML = `
<!DOCTYPE html>
<html>
<head>
	<title>AI Chat</title>
	<style>
		body { 
			font-family: system-ui;
			max-width: 800px;
			margin: 50px auto;
			padding: 20px;
		}
		h1 {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		#clearBtn {
			font-size: 14px;
			padding: 8px 16px;
			cursor: pointer;
		}
		#chatBox {
			border: 1px solid #ccc;
			height: 400px;
			overflow-y: auto;
			padding: 10px;
			margin: 10px 0;
		}
		.msg {
			margin: 10px 0;
			padding: 10px;
			border-radius: 5px;
		}
		.user {
			background: #e3f2fd;
			text-align: right;
		}
		.assistant {
			background: #f5f5f5;
		}
		.loading {
			background: #f5f5f5;
			font-style: italic;
			color: #666;
		}
		#messageInput {
			width: 80%;
			padding: 10px;
		}
		#sendBtn {
			padding: 10px 20px;
		}
		#sendBtn:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	</style>
</head>
<body>
	<h1>
		<span>AI Chat</span>
		<button id="clearBtn">Clear Chat</button>
	</h1>
	<div id="chatBox"></div>
	<input type="text" id="messageInput" placeholder="Type a message..." />
	<button id="sendBtn">Send</button>

	<script>
		// generate unique session ID for this browser tab
		const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
		const chatBox = document.getElementById('chatBox');
		const msgInput = document.getElementById('messageInput');
		const sendBtn = document.getElementById('sendBtn');
		const clearBtn = document.getElementById('clearBtn');

		async function send() {
			const msg = msgInput.value.trim();
			if (!msg) return;

			displayMsg('user', msg);
			msgInput.value = '';
			sendBtn.disabled = true;

			const loader = displayMsg('loading', 'Thinking...');

			try {
				const res = await fetch('/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message: msg, sessionId })
				});

				const data = await res.json();
				loader.remove();
				displayMsg('assistant', data.response);
			} catch (err) {
				loader.remove();
				displayMsg('assistant', 'Sorry, something went wrong. Please try again.');
			}

			sendBtn.disabled = false;
			msgInput.focus();
		}

		function displayMsg(type, text) {
			const div = document.createElement('div');
			div.className = 'msg ' + type;
			div.textContent = text;
			chatBox.appendChild(div);
			chatBox.scrollTop = chatBox.scrollHeight;
			return div;
		}

		async function clearConversation() {
			if (!confirm('Clear conversation history?')) return;
			
			await fetch('/clear', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId })
			});

			chatBox.innerHTML = '';
		}

		sendBtn.onclick = send;
		clearBtn.onclick = clearConversation;
		msgInput.onkeypress = (e) => { 
			if (e.key === 'Enter' && !sendBtn.disabled) send(); 
		};
		msgInput.focus();
	</script>
</body>
</html>
`;