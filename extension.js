/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* exported init */

// Import GNOME Shell's Extension base class (GNOME 45+ style)
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

// Import GLib for idle callbacks, and Meta for window management
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

// Export your custom extension class as default (GNOME requires this?)
export default class AutoMaximizeWindows extends Extension {
    constructor(metadata) {
        super(metadata);
        this._handlerId = null;  // Will hold signal connection ID
    }

    enable() {
        // Connect to the global 'window-created' signal
        this._handlerId = global.display.connect('window-created', (_display, window) => {
            // Ensure it's a proper Meta.Window object
            if (!(window instanceof Meta.Window)) return;

            // Delay execution until window is initialized
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                // Ensure the window is still valid
                if (!window || window.destroyed) return GLib.SOURCE_REMOVE;

                // Try maximizing the window if it's "almost" maximized
                this._maybeMaximize(window);
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    disable() {
        // Disconnect the signal to cleanly unload the extension
        if (this._handlerId !== null) {
            global.display.disconnect(this._handlerId);
            this._handlerId = null;
        }
    }

    _maybeMaximize(window) {
        // Skip taskbar-less or non-normal windows (e.g., dialogs, tooltips)
        if (window.skip_taskbar) return;
        if (window.window_type !== Meta.WindowType.NORMAL) return;

        // Skip if the window is already maximized
        if (window.maximized_horizontally && window.maximized_vertically) return;

        // Get the monitor and the usable work area for the window's workspace
        const monitor = window.get_monitor();
        const workspace = window.get_workspace();
        const workArea = workspace.get_work_area_for_monitor(monitor);

        // Get current window's position and size
        const frame = window.get_frame_rect();

        // Define margin of error for considering a window "almost maximized"
        const tolerance = 20;

        // Check if all 4 edges are within the margin of the screen edges
        const alignedLeft   = Math.abs(frame.x - workArea.x) <= tolerance;
        const alignedTop    = Math.abs(frame.y - workArea.y) <= tolerance;
        const alignedRight  = Math.abs((frame.x + frame.width) - (workArea.x + workArea.width)) <= tolerance;
        const alignedBottom = Math.abs((frame.y + frame.height) - (workArea.y + workArea.height)) <= tolerance;

        // If all edges are close to the screen's work area → treat as almost-maximized
        if (alignedLeft && alignedTop && alignedRight && alignedBottom) {
            // Maximize both horizontally and vertically
            window.maximize(Meta.MaximizeFlags.BOTH);
        }
    }
}

