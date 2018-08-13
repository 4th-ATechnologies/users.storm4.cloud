import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

// Material UI

import {
	createStyles,
	StyleRulesCallback,
	Theme,
	withStyles,
	WithStyles 
} from '@material-ui/core/styles';

import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography';

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
	},
	searchTextField: {
		width: 225
	}
});

interface ISearchProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
}

interface ISearchState {
}

class Search extends React.Component<ISearchProps, ISearchState> {

	public render() {
		const {classes} = this.props;

		return (
			<div className={classes.root}>
				<Typography variant="display2" >
					Securely send files
				</Typography><br/>
				<Typography variant="subheading">
					<ul>
						<li>Send files to any Storm4 user</li>
						<li>Files are encrypted in your browser being uploading</li>
						<li>Storm4 users have their public keys secured on the blockchain</li>
					</ul>
				</Typography>
				<TextField
					id="search"
					label="Search for user"
					type="search"
					className={classes.searchTextField}
					margin="normal"
				/>
			</div>
		);
	}
}

export default withStyles(styles)(withRouter(Search));
