import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import App from './App';
import './index.css';
import registerServiceWorker from './registerServiceWorker';

const theme = createMuiTheme({
	palette: {
		type: 'dark',
		primary: {
			main: '#0C6096', // blue from Storm4 logo
		}
	}
});

ReactDOM.render((
	<BrowserRouter>
		<MuiThemeProvider theme={theme}>
			<App />
		</MuiThemeProvider>
	</BrowserRouter>

),document.getElementById('root') as HTMLElement);
registerServiceWorker();
