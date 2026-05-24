import { app, shell } from 'electron';
import { createTray } from './tray';
import { startServer } from './server'

const port = 3456;

app.whenReady().then(async () => {
	await startServer(port);
	createTray(port);
	shell.openExternal(`http://localhost:${port}`);
});


// use https://react-hot-toast.com/
// add email regex to email POST
// show delete button in student card, even if not archived, but show that you need to archive first

// The default is to quit. We subscribe to window-all-closed to override that,
// wherein we *don't* quit, so it stays active in the tray.
app.on('window-all-closed', () => {})
