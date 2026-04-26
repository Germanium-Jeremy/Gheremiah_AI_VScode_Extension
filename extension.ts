import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

const GEMINI_API_KEY = ''; // Move this to secure storage!
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export function activate(context: vscode.ExtensionContext) {
    console.log('Gheremiah AI extension is now active!');

    const disposable = vscode.commands.registerCommand('gheremiahai.start', () => {
        const panel = vscode.window.createWebviewPanel(
            'gheremiahai',
            'Gheremiah AI Assistant',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'src')),
                    vscode.Uri.file(path.join(context.extensionPath, 'out'))
                ]
            }
        );

        // Get the path to your HTML file
        const htmlPath = path.join(context.extensionPath, 'src', 'index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Convert CSS file path to webview URI
        const cssPath = path.join(context.extensionPath, 'src', 'output.css');
        const cssUri = panel.webview.asWebviewUri(vscode.Uri.file(cssPath));
        htmlContent = htmlContent.replace(
            'href="./output.css"',
            `href="${cssUri.toString()}"`
        );
        
        // Convert script file path to webview URI
        const scriptPath = path.join(context.extensionPath, 'out', 'src', 'scripts', 'chat.js');
        const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(scriptPath));
        htmlContent = htmlContent.replace(
            'src="./scripts/chat.js"',
            `src="${scriptUri.toString()}"`
        );
        
        panel.webview.html = htmlContent;

        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'askGemini') {
                const userPrompt = message.text;
                vscode.window.showInformationMessage(`🤔 Asking Gheremiah AfffdI...`);

                try {
                    const response = await axios.post(GEMINI_API_URL, {
                        contents: [{
                            parts: [{ text: userPrompt }]
                        }]
                    });

                    const geminiReply = response.data.candidates[0].content.parts[0].text;
                    panel.webview.postMessage({ command: 'gheremiahResponse', text: geminiReply });

                } catch (error) {
                    console.error('API Error:', error);
                    let errorMessage = 'Sorry, I encountered an error. ';
                    if (axios.isAxiosError(error) && error.response?.status === 429) {
                        errorMessage += 'Rate limit exceeded. Please try again in a moment.';
                    } else if (axios.isAxiosError(error) && error.response?.status === 403) {
                        errorMessage += 'Invalid API key. Please check your configuration.';
                    } else {
                        errorMessage += 'Please check your API key and try again.';
                    }
                    panel.webview.postMessage({ command: 'gheremiahResponse', text: errorMessage });
                }
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}