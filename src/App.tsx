import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

import imgLogo from './images/logoGray.png';
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

import withWidth, { isWidthUp, WithWidth } from '@material-ui/core/withWidth';

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
		maxWidth: '900px',
		marginTop: theme.spacing.unit * 2,
		marginBottom: 0,
		marginLeft: 0,
		marginRight: 0,
	},
	footer: {
		display: 'flex',
		flexGrow: 1,
		marginTop: theme.spacing.unit * 3,
		marginBottom: 0,
		marginLeft: 0,
		marginRight: 0,
		padding: 0
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
	toolbar: theme.mixins.toolbar,
	logoImage: {
		margin: 0,
		padding: '18px 0 0 0', // top left bottom right
		'-webkit-filter': 'drop-shadow(0px 0px 10px rgba(215,215,215,1.0))',
		'filter'        : 'drop-shadow(0px 0px 10px rgba(215,215,215,1.0))'
	},
	logoTitle: {
		fontFamily: '"Exo 2"',
		margin: 8,
		paddingLeft: 4,
		color: '#303030',
		textShadow: '0px 0px 10px rgba(215,215,215,1.0)' // x offset, y offset, blur radius, color
	},
	a_hideLink: {
		color: 'inherit',
		textDecoration: 'none'
	},
	forkMe: {
		position: "absolute",
		top: 0,
		right: 0,
		border: 0
	}
});

interface IAppProps extends RouteComponentProps<any>, WithStyles<typeof styles>, WithWidth {
}

interface IAppState {
}

class App extends React.Component<IAppProps, IAppState> {

	public render() {
		const {classes} = this.props;

		let githubBanner: React.ReactNode|null = null;
		if (isWidthUp('sm', this.props.width))
		{
			githubBanner = (
				<img
					src="https://s3.amazonaws.com/github/ribbons/forkme_right_white_ffffff.png"
					alt="Fork me on GitHub"
					className={classes.forkMe}
				/>
			);
		}

		return (
			<div className={classes.root}>
				<CssBaseline />
				<div className={classes.header}>
					<div className={classes.headerContent}>
						<a href="/search">
							<img src={imgLogo} className={classes.logoImage}/>
						</a>
						<Typography variant="display3" color="inherit" className={classes.logoTitle}>
							<a href="/search" className={classes.a_hideLink}>Storm4</a>
						</Typography>
					</div>
				</div>
				<div className={classes.center}>
					<MainPage/>
				</div>
				<div className={classes.footer}>
				</div>
				{githubBanner}
			</div>
		);
	}
}

export default withWidth()(withStyles(styles)(withRouter(App)));
