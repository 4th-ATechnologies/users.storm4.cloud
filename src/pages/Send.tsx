import * as React from 'react';
import * as _ from 'lodash';

import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

import {Logger} from '../util/logging'

// Material UI

import {
	createStyles,
	StyleRulesCallback,
	Theme,
	withStyles,
	WithStyles 
} from '@material-ui/core/styles';

import Avatar from '@material-ui/core/Avatar';
import Typography from '@material-ui/core/Typography';

const log = Logger.Make('debug', 'Send');

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
		margin: 0,
		padding: 0
	}
});

interface ISendProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
}

interface ISendState {
	foobar: number
}

class Send extends React.Component<ISendProps, ISendState> {

	public render(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		return (
			<div className={classes.root}>
				<Typography variant="subheading">{"Send content goes here"}</Typography>
			</div>
		);
	}

	public componentDidMount() {
		log.debug("componentDidMount()");
	}
}

export default withStyles(styles)(withRouter(Send));