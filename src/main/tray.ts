import { Tray, Menu, shell, app } from 'electron';
import path from 'path';

export function createTray(port: number): Tray {
    const tray = new Tray(path.join(__dirname, '../../resources/icon.png'));
    tray.setToolTip('ETEEAP Tracker');
    tray.on('click', () => shell.openExternal(`http://localhost:${port}`));
    
    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: 'Open in browser',
            click: () => shell.openExternal(`http://localhost:${port}`)
        },
        {
            label: 'Quit',
            click: () => app.quit()
        },
    ]));

    return tray;
}