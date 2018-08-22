import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

import imgLogo58 from './images/logo58.png';
import imgHeaderBackground from './images/background2.jpg'

import MainPage from './pages/MainPage'

// Material UI

import {
	createStyles,
	StyleRulesCallback,
	Theme,
	withStyles,
	WithStyles 
} from '@material-ui/core/styles';

import CssBaseline from '@material-ui/core/CssBaseline';
import Typography from '@material-ui/core/Typography';

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
	header: {
		display: 'flex',
		flexGrow: 1,
		minWidth: '100%',
		minHeight: '50px',
		backgroundImage: `url(${imgHeaderBackground})`,
		backgroundColor: 'rgba(0, 0, 0, 1)',
		backgroundPosition: 'center top',
		backgroundSize: 'cover',
		backgroundRepeat: 'no-repeat',
		margin: 0,
		padding: 0
	},
	center: {
		display: 'flex',
		flexGrow: 1,
		margin: 0,
		padding: 0,
		maxWidth: '900px',
	},
	footer: {
		display: 'flex',
		flexGrow: 1,
		padding: theme.spacing.unit * 3,
	},
	headerContent: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		minWidth: '100%',
		margin: 0,
		padding: 0,
	},
	centerContent: {
		display: 'inline'
	},
	toolbar: theme.mixins.toolbar,
	logoImage: {
		margin: 0,
		padding: 0,
	},
	logoTitle: {
		fontFamily: '"Exo 2"',
		margin: theme.spacing.unit,
		paddingLeft: theme.spacing.unit,
		color: '#303030',
		textShadow: '#C1C1C1 0px 0px 10px'
	}
});

interface IAppProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
}

interface IAppState {
}

class App extends React.Component<IAppProps, IAppState> {

	public render() {
		const {classes} = this.props;

		return (
			<div className={classes.root}>
				<CssBaseline />
				<div className={classes.header}>
					<div className={classes.headerContent}>
						<img src={imgLogo58} className={classes.logoImage}/>
						<Typography variant="display3" color="inherit" className={classes.logoTitle}>Storm4</Typography>
					</div>
				</div>
				<div className={classes.center}>
					<MainPage/>
				</div>
				<div className={classes.footer}>
				</div>
			</div>
		);
	}
}

export default withStyles(styles)(withRouter(App));
