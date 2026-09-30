const fs = require('fs');
let c = fs.readFileSync('src/pages/Auth.jsx', 'utf8');

// Remove the GoogleOAuthProvider import
c = c.replace(/import \{ GoogleOAuthProvider, GoogleLogin \} from '@react-oauth\/google';\n/, 
               "import { GoogleLogin } from '@react-oauth/google';\n");

// Remove GoogleOAuthProvider wrapper - replace <GoogleOAuthProvider ...> and </GoogleOAuthProvider> 
// Keep only the inner content
c = c.replace(/<GoogleOAuthProvider clientId=\{GOOGLE_CLIENT_ID \|\| 'dummy-client-id'\}>\n/, '');
c = c.replace(/<\/GoogleOAuthProvider>\n/, '');

fs.writeFileSync('src/pages/Auth.jsx', c, 'utf8');
console.log('Done.');
console.log('Has GoogleOAuthProvider import:', c.includes('GoogleOAuthProvider'));
console.log('Has GoogleLogin import:', c.includes('GoogleLogin'));
