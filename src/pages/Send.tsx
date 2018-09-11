import * as _ from 'lodash';
import * as aws4 from 'aws4';
import * as filesize from 'filesize';
import * as merkle_tree_gen from 'merkle-tree-gen';
import * as queryString from 'query-string';
import * as React from 'react';
import * as S3 from 'aws-sdk/clients/s3';
import * as base64 from 'base64-js'

import Dropzone, {ImageFile} from 'react-dropzone'
import ReactImageFallback from 'react-image-fallback';

import {Credentials as AWSCredentials} from 'aws-sdk';
import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'
import {encode as utf8_encode} from 'utf8';

import * as api_gateway from '../util/APIGateway';
import * as credentials_helper from '../util/Credentials';
import * as util from '../util/Util';
import * as users_cache from '../util/UsersCache';

import {Logger} from '../util/Logging'

import {
	UserInfo,
	Auth0Identity,
	Auth0Profile,
	UserProfile,
	PubKey,
	MerkleTreeFile,
	MerkleTreeFileValue,
	S4Rcrd,
	S4Rcrd_Metadata,
	S4Rcrd_Data_Message,
	make_attachment,
	S4MultipartCompleteRequest,
	S4MultipartCompleteResponse
} from '../models/models'

// Material UI

import {
	createStyles,
	StyleRulesCallback,
	Theme,
	withStyles,
	WithStyles,
} from '@material-ui/core/styles';

import Avatar from '@material-ui/core/Avatar';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import IconButton from '@material-ui/core/IconButton';
import LinearProgress from '@material-ui/core/LinearProgress';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField'
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import DeleteIcon from '@material-ui/icons/Delete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';


const log = Logger.Make('debug', 'Send');

const AVATAR_SIZE = 96;
const COMMENT_MAX_LENGTH = 200;

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		margin: 0,
		padding: 0
	},
	section_identity: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		maxWidth: 400,
		margin: 0,
		paddingTop: 0,
		paddingBottom: 0,
		paddingLeft: theme.spacing.unit,
		paddingRight: theme.spacing.unit,
	//	backgroundColor: 'pink'
	},
	section_identity_avatar: {
		flexBasis: 'auto',
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		boxShadow: '#C1C1C1 0px 0px 2px'
	},
	section_identity_avatar_img: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE
	},
	section_identity_fetching: {
		flexBasis: 'auto',
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		marginLeft: theme.spacing.unit * 2,
	},
	section_identity_fetching_progress: {
		marginRight: theme.spacing.unit * 2
	},
	section_identity_nameAndProvider: {
		flexBasis: 'auto',
		marginLeft: theme.spacing.unit * 2,
		marginRight: theme.spacing.unit * 2
	},
	section_identity_name: {
		marginBottom: theme.spacing.unit
	},
	identityProviderImg: {
		backgroundColor: 'rgb(255,255,255)',
		paddingLeft: 6,
		paddingRight: 6,
		paddingTop: 3,
		paddingBottom: 3,
		borderRadius: 3
	},
	section_expansionPanels: {
		marginTop: theme.spacing.unit * 2,
		maxWidth: 600,
	},
	section_expansionPanel_summary: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
	},
	section_expansionPanel_summary_text: {
		marginLeft: theme.spacing.unit * 2
	},
	section_expansionPanel_details: {
	},
	span_underline: {
		textDecoration: 'underline'
	},
	a_noLinkColor: {
		color: 'inherit'
	},
	indented: {
		marginLeft: theme.spacing.unit * 2
	},
	wrap: {
		wordWrap: 'break-word',
		wordBreak: 'break-all',

		// This does what we want, but doesn't seem to work
		overflowWrap: 'break-word'
	},
	gray: {
		color: theme.palette.text.secondary
	},
	monospaced: {
		// IBM Plex Mono - Because I'm a fan
		// Inconsolata   - Popular with programmers
		// Consolas      - Microsoft
		// Menlo         - Apple

		fontFamily: '"IBM Plex Mono", "Inconsolata", "Consolas", "Menlo", "Courier New", monospace',
	},
	blockquote: {
		marginLeft  : theme.spacing.unit * 2,
		fontFamily  : 'Consolas, "Times New Roman", Verdana',
		borderLeft  : '2px solid #CCC',
		paddingLeft : '8px'
	},
	sub_ul: {
		wordWrap: 'break-word',
		wordBreak: 'break-all',
		marginLeft: theme.spacing.unit * 2,
		paddingLeft: 0,
	},
	sub_ul_li: {
		wordWrap: 'break-word',
		wordBreak: 'break-all',
		paddingLeft: 0,
		marginLeft: 0
	},
	listItemIcon_avatar: {
		width: 32,
		height: 32
	},
	listItemIcon_avatar_img: {
		width: 32,
		height: 32
	},
	listItemText: {
		marginLeft: 0,
		paddingLeft: 0
	},
	section_fileSelection: {
		marginTop: theme.spacing.unit * 4
	},
	dropZone_description_container: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		height: 200,
		margin: 0,
		padding: theme.spacing.unit
	},
	dropZone_description_text_primary: {
		flexBasis: 'auto'
	},
	dropZone_description_text_secondary: {
		flexBasis: 'auto',
		color: theme.palette.text.secondary,
		marginTop: theme.spacing.unit,
		marginBottom: theme.spacing.unit
	},
	section_uploadInfo: {
		marginTop: theme.spacing.unit * 4, // <= should match section_fileSelection
		width: 350,
		height: 200,
		borderWidth: 2,
		borderColor: '#666',
		borderStyle: 'dashed',
		borderRadius: 5
	},
	uploadInfo_description_container: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'flex-start',
		alignItems: 'center',
		alignContent: 'center',
		height: 200,
		margin: 0,
		paddingTop: theme.spacing.unit * 2,
		paddingBottom: theme.spacing.unit,
		paddingLeft: theme.spacing.unit,
		paddingRight: theme.spacing.unit
	},
	uploadInfo_text: {
		flexBasis: 'auto'
	},
	uploadInfo_text_separate: {
		flexBasis: 'auto',
		marginTop: theme.spacing.unit,
	},
	uploadInfo_button: {
		marginTop: theme.spacing.unit * 4
	},
	uploadInfo_icon: {
		width: 32,
		height: 32,
		marginTop: theme.spacing.unit
	},
	section_fileList: {
		marginTop: theme.spacing.unit * 4
	},
	table: {
		maxWidth: 600,
		[theme.breakpoints.up('sm')]: {
			minWidth: 600
		},
		[theme.breakpoints.only('xs')]: {
			minWidth: '100%',
			width: '100%',
			tableLayout: 'fixed',
		}
	},
	tableRow: {
		backgroundColor: theme.palette.background.paper,
	},
	tableCell_right: {
		width: 150
	},
	tableCell_div_container_fileName: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		alignContent: 'center',
		marginLeft: theme.spacing.unit * 3, // set to line up with ExpansionPanel
		marginRight: 0, 
		marginTop: 2,
		marginBottom: 2,
	},
	fileNameWithProgress: {
		wordWrap: 'break-word',
		wordBreak: 'break-all',

		// This does what we want, but doesn't seem to work
		overflowWrap: 'break-word',

		paddingTop: 4,
		paddingBottom: 0 // <= space for progress bar
	},
	fileNameWithoutProgress: {
		wordWrap: 'break-word',
		wordBreak: 'break-all',

		// This does what we want, but doesn't seem to work
		overflowWrap: 'break-word',

		paddingTop: 4,
		paddingBottom: 4 // <= empty space replaces progress bar
	},
	tableCell_div_container_buttons: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'flex-end',
		alignItems: 'center',
		alignContent: 'center',
		marginLeft: theme.spacing.unit * 2,
		marginRight: theme.spacing.unit * 2, // set to line up with ExpansionPanel
		marginTop: 2,
		marginBottom: 2
	},
	fileSizeText: {
		marginRight: theme.spacing.unit
	},
	tableCell_buttonRight: {
		width: 32,
		height: 32,
	},
	tableCell_buttonRight_icon: {
		width: 22,
		height: 22
	},
	tableCell_iconRight: {
		width: 22,
		height: 22,
		marginLeft: 5,
		marginRight: 5
	},
	tableCell_circularProgress: {
		marginLeft: 8,
		marginRight: 8
	},
	tableCell_linearProgress: {
		width: '100%',
		height: 2,
		marginTop: 2
	},
	comment: {
		width: 300
	},
	section_sendButton: {
		marginTop: theme.spacing.unit * 3
	}
});

interface UploadState_Multipart {
	part_size     : number,
	num_parts     : number,
	upload_id     : string|null
	current_part  : number,
	progress: {
		[index: number]: number|undefined
	},
	eTags: {
		[index: number]: string|undefined
	}
}

interface UploadState_File {
	encryption_key     : Uint8Array,
	random_filename    : string,
	request_id_rcrd    : string,
	request_id_data    : string,
	file_preview       : ArrayBuffer|null,
	has_uploaded_rcrd  : boolean,
	unipart_progress   : number,
	multipart_state   ?: UploadState_Multipart,
	anonymous_id      ?: string,
	cloud_id          ?: string,
}

interface UploadState_Msg {
	encryption_key     : Uint8Array,
	random_filename    : string,
	request_id_rcrd    : string,
	has_uploaded_rcrd  : boolean,
}

interface UploadState {
	upload_id    : string,
	burn_date    : number,
	done_polling : boolean,
	files        : UploadState_File[],
	msg          : UploadState_Msg|null
}

interface ISendProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
	user_id     : string,
	identityID ?: string
}

interface ISendState {

	// User profile (region, bucket & auth0 identities)
	// 
	is_fetching_user_profile : boolean,
	user_profile              : UserProfile|null,
	user_profile_identity_idx : number|null,
	user_profile_err_msg      : string|null,

	// Public key
	// 
	is_fetching_public_key : boolean,
	public_key             : PubKey|null,
	public_key_err_msg     : string|null,

	// Blockchain info
	//
	is_fetching_merkle_tree_root : boolean,
	merkle_tree_root             : string|null,
	merkle_tree_root_err_msg     : string|null

	is_fetching_merkle_tree_file : boolean,
	merkle_tree_file             : MerkleTreeFile|null,
	merkle_tree_file_err_msg     : string|null,

	// PubKey Verification
	// 
	is_verifying_public_key     : boolean,
	pubkey_verifcation_success  : boolean|null,
	pubkey_verification_err_msg : string|null,
	pubkey_tampering_detected   : boolean|null,
	calculated_merkle_tree_root : string|null

	// User identity menu
	//
	userIdentsMenuAnchor : HTMLElement|null,
	userIdentsMenuOpen   : boolean,

	// Files & comment
	// 
	file_list           : ImageFile[]
	commentTextFieldStr : string,

	// Uploading
	// 
	is_uploading      : boolean,
	upload_index      : number,
	upload_success    : boolean,
	upload_err_retry  : number|null,
	upload_err_fatal  : string|null
	upload_state      : UploadState|null,
}

function getStartingState(): ISendState {
	const state: ISendState = {
		is_fetching_user_profile  : false,
		user_profile              : null,
		user_profile_identity_idx : null,
		user_profile_err_msg      : null,

		is_fetching_public_key : false,
		public_key             : null,
		public_key_err_msg     : null,

		is_fetching_merkle_tree_root : false,
		merkle_tree_root             : null,
		merkle_tree_root_err_msg     : null,

		is_fetching_merkle_tree_file : false,
		merkle_tree_file             : null,
		merkle_tree_file_err_msg     : null,

		is_verifying_public_key     : false,
		pubkey_verifcation_success  : null,
		pubkey_verification_err_msg : null,
		pubkey_tampering_detected   : null,
		calculated_merkle_tree_root : null,

		userIdentsMenuAnchor : null,
		userIdentsMenuOpen   : false,

		file_list           : [],
		commentTextFieldStr : "",

		is_uploading      : false,
		upload_index      : 0,
		upload_success    : false,
		upload_err_retry  : null,
		upload_err_fatal  : null,
		upload_state      : null
	};
	return state;
}

class Send extends React.Component<ISendProps, ISendState> {

	public state: ISendState = getStartingState();

	protected retry_start: number|null = null;
	protected retry_timer: NodeJS.Timer|null = null;

	protected test_count = 0;

	protected isProbablyMobile(): boolean
	{
		const user_agent = navigator.userAgent;

		const regex_android = new RegExp(/Android/i);
		const regex_iOS     = new RegExp(/iPhone|iPad|iPod/i);

		const android = regex_android.test(user_agent);
		const iOS     = regex_iOS.test(user_agent);

		return (android || iOS);
	}

	/**
	 * Returns the index of the identity that should be displayed.
	 * That is:
	 * - state.user_profile.auth0.identitie[THIS_NUMBER_HERE]
	 * 
	 * This is done by checking the various posibilities including:
	 * - query parameters
	 * - the user's preferred identity
	 * - an explicitly selected identity
	**/
	protected getIdentityIdx = (): number => {

		const user_profile = this.state.user_profile;
		if (user_profile == null) {
			return 0;
		}

		const manually_selected_idx = this.state.user_profile_identity_idx;
		if (_.isNumber(manually_selected_idx)) {
			return manually_selected_idx;
		}
		
		// - this.props.identityID:
		// 	This is the ID that was displayed via the search results.
		//    We use it to maintain a consistent experience.
		// 
		// - user_profile.auth0.user_metadata.preferedAuth0ID
		// 	This is what the user has selected as their default identity.

		const search_id =
			this.props.identityID ||
			user_profile.auth0.user_metadata.preferedAuth0ID ||
			user_profile.auth0.user_metadata.preferredAuth0ID;

		if (search_id)
		{
			let identityIdx = 0;
			for (const identity of user_profile.auth0.identities)
			{
				const identityID = `${identity.provider}|${identity.user_id}`;
				if (identityID == search_id)
				{
					return identityIdx;
				}

				identityIdx++;
			}
		}

		return 0;
	}

	protected getCloudPath = (
		file_state: UploadState_File
	): string =>
	{
		return `com.4th-a.storm4/temp/${file_state.random_filename}`;
	}

	protected getStagingPathForFile = (
		options: {
			upload_state : UploadState,
			file_state   : UploadState_File,
			file         : ImageFile,
			ext          : "rcrd"|"data"
		}
	): string =>
	{
		// ----- TEMP CODE -----
		// Replace me with proper staging path for user bucket.

		const {upload_state, file_state, file, ext} = options;

		const upload_id = upload_state.upload_id;
		const random_filename = file_state.random_filename;
		const cleartext_filename = file.name;

		return `staging/${upload_id}_${random_filename}_${cleartext_filename}.${ext}`;

		//
		// ----- TEMP CODE -----
	}

	protected getStagingPathForMsg(
		options: {
			upload_state : UploadState,
			msg_state    : UploadState_Msg
		}
	): string
	{
		// ----- TEMP CODE -----
		// Replace me with proper staging path for user bucket.

		const upload_id = options.upload_state.upload_id;
		const random_filename = options.msg_state.random_filename;
		
		return `staging/${upload_id}_${random_filename}_msg.rcrd`;

		//
		// ----- TEMP CODE -----
	}

	protected getEncryptedFileSize(
		options: {
			file       : ImageFile,
			file_state : UploadState_File
		}
	): number
	{
		const {file_preview} = options.file_state;

		const header_size    = 64;
		const thumbnail_size = file_preview ? file_preview.byteLength : 0;
		const file_size      = options.file.size;

		const unencrypted = header_size + thumbnail_size + file_size;

		const BLOCK_SIZE = 1024;
		const blocks = Math.ceil(unencrypted / BLOCK_SIZE);

		return (blocks *  BLOCK_SIZE);
	}

	protected getProgress(
		options: {
			file       : ImageFile,
			file_state : UploadState_File
		}
	): number
	{
		const {file, file_state} = options;
		
		let progress: number = 0;
		if (file_state.multipart_state)
		{
			const multipart_state = file_state.multipart_state;

			const bytes_total = this.getEncryptedFileSize(options);
			let bytes_uploaded = 0;

			for (let i = 0; i < multipart_state.num_parts; i++)
			{
				const part_progress = multipart_state.progress[i];
				if (part_progress != null)
				{
					let part_size: number;
					if (i == (multipart_state.num_parts-1)) {
						part_size = (bytes_total - (multipart_state.part_size * i));
					}
					else {
						part_size = multipart_state.part_size;
					}

					bytes_uploaded += Math.floor(part_progress * part_size);
				}
			}

			progress = (bytes_uploaded / bytes_total);
		}
		else
		{
			progress = file_state.unipart_progress;
		}

		return progress;
	}

	protected fetchUserProfile = ()=> {
		log.debug("fetchUserProfile()");

		users_cache.fetchUserProfile(this.props.user_id, (err, status_code, user_profile)=> {

			log.debug("fetchUserProfile: err: "+ err);
			log.debug("fetchUserProfile: status_code: "+ status_code);
			log.debug("fetchUserProfile: user_profile: "+ JSON.stringify(user_profile, null, 2));

			let err_msg: string|null = null;
			if (err)
			{
				err_msg = "Unable to fetch user. Check internet connection.";
			}
			else if (status_code != 200 || user_profile == null)
			{
				err_msg = (status_code == 404)
				  ? "User not found. The userID may be incorrect, or the user may have deleted their account."
				  : "User not found. The server may be experiencing technical difficulties."
			}
			else if (user_profile.s4.deleted)
			{
				err_msg = "User account has been deleted."
			}

			if (err_msg)
			{
				this.setState({
					is_fetching_user_profile : false,
					user_profile_err_msg     : err_msg
				});
				return;
			}
			else
			{
				user_profile = user_profile!;

				let selected_idx: number|null = null;

				const qp = queryString.parse(this.props.location.search);
				const idh = qp.idh;
				if (idh)
				{
					selected_idx = util.findSelectedIdentity({
						identities : user_profile.auth0.identities,
						idh        : idh
					});
				}

				this.setState({
					is_fetching_user_profile  : false,
					user_profile              : user_profile,
					user_profile_identity_idx : selected_idx

				}, ()=> {

					this.fetchPublicKey();
					this.fetchBlockchainInfo();
				});
			}
		});
	}

	public fetchPublicKey = ()=> {
		log.debug("fetchPublicKey()");

		const user_profile = this.state.user_profile;
		if (user_profile == null) {
			return;
		}

		this.setState({
			is_fetching_public_key : true
		});

		const url = util.pubKeyUrlForUser(user_profile.s4);

		fetch(url, {
			method: 'GET'

		}).then((response)=> {

			if (response.status != 200)
			{
				log.err("Error fetching pubKey: "+ response.status);

				const err_msg = "User's public key not found!";
				this.setState({
					is_fetching_public_key     : false,
					public_key_err_msg         : err_msg,
					pubkey_verifcation_success : false
				});
				return Promise.reject();
			}

			return response.json();

		}).then((json)=> {

			log.debug("pubKey JSON: "+ JSON.stringify(json, null, 2));

			this.setState({
				is_fetching_public_key : false,
				public_key             : json

			}, ()=> {

				if (this.state.public_key && this.state.merkle_tree_file) {
					this.verifyPublicKey();
				}
			});

		}).catch((reason)=> {

			if (reason == null)
			{
				// This is why I don't like promises...
				// This is called when the statusCode != 200.
				// 
				// Yup, it's retarded.
			}
			else
			{
				log.err("Error fetching pubKey: "+ reason);

				const err_msg = "User's public key not found! Check internet connection.";
				this.setState({
					is_fetching_public_key     : false,
					public_key_err_msg         : err_msg,
					pubkey_verifcation_success : false
				});
			}
		});
	}

	public fetchBlockchainInfo = (): void => {
		log.debug("fetchBlockchainInfo()");

		const user_profile = this.state.user_profile;
		if (user_profile == null) {
			return;
		}

		this.setState({
			is_fetching_merkle_tree_root : true
		});

		const url = util.rpcURL();
		const body_obj = util.rpcJSON(user_profile.s4.user_id);

		log.debug(`POST: ${url}: ${JSON.stringify(body_obj, null, 2)}`);

		fetch(url, {
			method : 'POST',
			body   : JSON.stringify(body_obj, null, 0)

		}).then((response)=> {

			if (response.status != 200)
			{
				log.err("Error fetching blockchainInfo: "+ response.status);

				const err_msg = "Could not fetch blockchain info. Ethereum node is having technical difficulties?.";
				this.setState({
					is_fetching_merkle_tree_root : false,
					merkle_tree_root_err_msg     : err_msg,
					pubkey_verifcation_success   : false
				});
				return;
			}

			return response.json();

		}).then((json)=> {

			log.debug("RPC JSON response: "+ JSON.stringify(json, null, 2));

			const merkle_tree_root = util.extractMerkleTreeRoot(json);
			log.debug("merkle_tree_root: "+ merkle_tree_root);

			if (merkle_tree_root.length == 0)
			{
				this.setState({
					is_fetching_merkle_tree_root : false,
					merkle_tree_root             : merkle_tree_root,
					pubkey_verifcation_success   : false
				});
			}
			else
			{
				this.setState({
					is_fetching_merkle_tree_root : false,
					is_fetching_merkle_tree_file : true,
					merkle_tree_root             : merkle_tree_root

				}, ()=> {

					this.fetchMerkleTree();
				});
			}

		}).catch((reason)=> {

			log.err("Error fetching blockchainInfo: "+ reason);

			const err_msg = "Could not fetch blockchain info! Check internet connection.";
			this.setState({
				is_fetching_merkle_tree_root : false,
				merkle_tree_root_err_msg     : err_msg,
				pubkey_verifcation_success   : false
			});
		});
	}

	public fetchMerkleTree = (): void => {
		log.debug("fetchMerkleTree()");

		const merkle_tree_root = this.state.merkle_tree_root;
		if (merkle_tree_root == null || merkle_tree_root.length == 0) {
			return;
		}

		this.setState({
			is_fetching_merkle_tree_file : true
		});

		const url = util.merkleTreeFileURL(merkle_tree_root);

		fetch(url, {
			method: 'GET'

		}).then((response)=> {

			if (response.status != 200)
			{
				log.err("Error fetching merkle tree: "+ response.status);

				const err_msg = "Could not fetch merkle tree. We may be experiencing technical difficulties.";
				this.setState({
					is_fetching_merkle_tree_file : false,
					merkle_tree_file_err_msg     : err_msg,
					pubkey_verifcation_success   : false
				});
				return;
			}

			return response.json();

		}).then((json)=> {

			log.debug("merkleTree JSON: "+ JSON.stringify(json, null, 2));

			this.setState({
				is_fetching_merkle_tree_file : false,
				is_verifying_public_key      : true,
				merkle_tree_file             : json

			}, ()=> {

				if (this.state.public_key && this.state.merkle_tree_file) {
					this.verifyPublicKey();
				}
			});

		}).catch((reason)=> {

			log.err("Error fetching merkleTree: "+ reason);

			const err_msg = "Could not fetch merkle tree! Check internet connection.";
			this.setState({
				is_fetching_merkle_tree_file : false,
				merkle_tree_file_err_msg     : err_msg,
				pubkey_verifcation_success   : false
			});
		});
	}

	protected verifyPublicKey = (): void => {
		log.debug("verifyPublicKey()");

		const merkle_tree_file = this.state.merkle_tree_file;
		if (merkle_tree_file == null) {
			return;
		}

		merkle_tree_gen.fromArray({
			array: merkle_tree_file.values
		
		}, (err, tree)=> {

			if (err || tree == null)
			{
				log.debug("merkle_tree_gen: err: "+ err);

				this.setState({
					is_verifying_public_key     : false,
					pubkey_verifcation_success  : false,
					pubkey_verification_err_msg : "Error performing crypto in browser. Is this an outdated browser?"
				});
				return;
			}

			log.debug("merkle_tree_gen: tree: "+ JSON.stringify(tree, null, 2));

			// Checks to perform:
			// - The merkle tree file contains an entry for our userID
			// - The merkle tree entry matches the public key info we fetched
			// - The merkle tree root matches our own calculations

			const _gotoErr = (msg: string): void => {
				this.setState({
					is_verifying_public_key     : false,
					pubkey_verifcation_success  : false,
					pubkey_verification_err_msg : msg,
					pubkey_tampering_detected   : true,
					calculated_merkle_tree_root : tree.root
				});
			}

			const user_profile = this.state.user_profile;
			const user_id = user_profile ? user_profile.s4.user_id : "";

			const pubkey = this.state.public_key!;

			const values_idx = merkle_tree_file.lookup[user_id];
			if (values_idx == null || values_idx < 0 || values_idx >= merkle_tree_file.values.length)
			{
				_gotoErr("UserID not found in merkle tree file !");
				return;
			}

			const value_json_str = merkle_tree_file.values[values_idx];
			let value: MerkleTreeFileValue|null = null;
			try {
				value = JSON.parse(value_json_str);
			} catch (e) {
				log.err("Error parsing merkle_tree_file.value[]: "+ e);
			}

			if (value == null             ||
				 !_.isObject(value)        ||
				 !_.isString(value.userID) ||
			    !_.isString(value.pubKey) ||
				 !_.isString(value.keyID))
			{
				_gotoErr("User's public key not found in merkle tree file !");
				return;
			}

			if (value.userID != user_id       ||
				 value.pubKey != pubkey.pubKey ||
			    value.keyID  != pubkey.keyID   )
			{
				_gotoErr("Public key information doesn't match value in merkle tree file !");
				return;
			}

			if (tree.root != merkle_tree_file.merkle.root)
			{
				_gotoErr("Merkle tree root mismatch !");
				return;
			}

			this.setState({
				is_verifying_public_key     : false,
				pubkey_verifcation_success  : true,
				pubkey_verification_err_msg : null,
				pubkey_tampering_detected   : false,
				calculated_merkle_tree_root : tree.root
			});
		});
	}

	protected userIdentsMenuButtonClicked = (
		event   : React.MouseEvent<HTMLElement>
	): void => {
		log.debug("userIdentsMenuButtonClicked()");
		
		this.setState({
			userIdentsMenuAnchor : event.currentTarget,
			userIdentsMenuOpen   : true
		});
	}

	protected userIdentsMenuItemSelected = (
		index : number,
		event : React.MouseEvent<HTMLElement>
	): void =>
	{
		log.debug(`userIdentsMenuItemSelected(${index})`);

		let idh: string|null = null;

		const user_profile = this.state.user_profile;
		if (user_profile)
		{
			const identities = user_profile.auth0.identities;
			if (index >= 0 && index < identities.length)
			{
				const identity = identities[index];
				idh = util.idhForIdentity(identity)
			}
		}

		this.setState({
			user_profile_identity_idx : index,
			userIdentsMenuAnchor      : null,
			userIdentsMenuOpen        : false

		}, ()=> {

			if (idh)
			{
				const user_id = user_profile!.s4.user_id;
				const url = `/id/${user_id}?idh=${idh}`

				this.props.history.replace(url);
			}
		});
	}

	protected userIdentsMenuClosed = ()=> {
		log.debug("userIdentsMenuClosed()");

		this.setState({
			userIdentsMenuAnchor : null,
			userIdentsMenuOpen   : false
		});
	}

	protected onDrop = (acceptedFiles: ImageFile[], rejectedFiles: ImageFile[])=> {
		log.debug("onDrop()");
		log.debug("acceptedFiles: "+ acceptedFiles);
		log.debug("rejectedFiles: "+ rejectedFiles);

		for (const file of acceptedFiles) {
			log.debug(`name(${file.name}) type(${file.type}) size(${file.size})`);
		}

		this.setState((current_state)=> {

			const next_state = {...current_state};
			for (const file of acceptedFiles) {
				next_state.file_list.push(file);
			}

			return next_state;
		});
	}

	protected deleteFile = (
		index : number,
		event : string
	): void =>
	{
		log.debug("deleteFile(): "+ index);

		this.setState((current_state)=> {

			const next_state = {...current_state};
			next_state.file_list.splice(index, 1);

			return next_state;
		});
	}

	protected commentTextFieldChanged = (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const newValue = event.target.value;
		log.debug("commentTextFieldChanged() => "+ newValue);

		this.setState({
			commentTextFieldStr: newValue
		});
	}

	protected onSend = (): void => {
		log.debug("onSend()");

		if (this.state.is_uploading) {
			log.debug("Ignoring duplicate click");
			return;
		}

		this.uploadNext();
	}

	protected onRetryTimerTick = (): void => {
		log.debug("onTimerTick()");

		let fire_timer = false;
		let cancel_timer = false;

		this.setState((current)=> {

			const next = _.cloneDeep(current) as ISendState;

			if (this.retry_timer)
			{
				if (next.upload_err_retry != null)
				{
					next.upload_err_retry--;
					if (next.upload_err_retry <= 0)
					{
						next.upload_err_retry = null;

						fire_timer = true;
						cancel_timer = true;
					}
				}
				else
				{
					cancel_timer = true;
				}
			}

			return next;

		}, ()=> {

			if (cancel_timer && this.retry_timer) {
				clearInterval(this.retry_timer);
				this.retry_timer = null;
				this.retry_start = null;
			}

			if (fire_timer) {
				this.uploadNext();
			}
		});
	}

	protected onRetryNow = (): void => {
		log.debug("onRetryNow()");

		this.setState({
			upload_err_retry: null
		}, ()=> {
			this.uploadNext();
		})
	}

	protected onStartOver = (): void => {
		log.debug("onStartOver()");

		this.setState(()=> {
			return getStartingState();
		}, ()=> {
			this.bootstrap();
		});
	}

	protected uploadNext(): void {
		log.debug("uploadNext()");

		const state = this.state;
		const {file_list, upload_index} = state;

		const file = file_list[upload_index];

		const old_upload_state = state.upload_state;
		let upload_state: UploadState;

		if (old_upload_state)
		{
			upload_state = _.cloneDeep(old_upload_state);
		}
		else
		{
			const upload_id = util.randomZBase32String(4);
			const burn_date = Date.now() + (1000 * 60 * 60 * 24 * 30);

			upload_state = {
				upload_id,
				burn_date,
				done_polling : false,
				files        : [],
				msg          : null
			};
		}

		// Initialize the following (if needed):
		// - upload_state.files[i]
		// - upload_state.msg
		// 
		if (upload_index < file_list.length)
		{
			if (upload_index >= upload_state.files.length)
			{
				log.debug(`Creating upload_state.files[${upload_index}]`);

				const encryption_key = util.randomEncryptionKey();
				const random_filename = util.randomFileName();

				const request_id_rcrd = util.randomHexString(16);
				const request_id_data = util.randomHexString(16);

				const file_state: UploadState_File = {
					encryption_key,
					random_filename,
					request_id_rcrd,
					request_id_data,
					file_preview      : null,
					has_uploaded_rcrd : false,
					unipart_progress  : 0
				};

				upload_state.files.push(file_state);
			}
		}
		else if (upload_state.done_polling)
		{
			if (upload_state.msg == null)
			{
				log.debug(`Creating upload_state.msg_state`);

				const encryption_key = util.randomEncryptionKey();
				const random_filename = util.randomFileName();

				const request_id_rcrd = util.randomHexString(16);

				const msg_state: UploadState_Msg = {
					encryption_key,
					random_filename,
					request_id_rcrd,
					has_uploaded_rcrd: false,
				};

				upload_state.msg = msg_state;
			}
		}

		this.setState({
			is_uploading : true,
			upload_state : upload_state

		}, ()=> {

			if (upload_index < file_list.length)
			{
				const file_state = upload_state.files[upload_index];

				if ( ! file_state.has_uploaded_rcrd) {
					this.uploadRcrd();
				}
				else {
					this.uploadFile();
				}
			}
			else if (!upload_state.done_polling)
			{
				this.uploadFiles_pollStatus({upload_state});
			}
			else
			{
				const msg_state = upload_state.msg!;

				if ( ! msg_state.has_uploaded_rcrd) {
					this.uploadMessage({upload_state, msg_state});
				}
				else if ( ! state.upload_success) {
					this.uploadMessage_pollStatus();
				}
				else {
					// Upload complete
				}
			}
		});
	}

	protected uploadRcrd(
	): void
	{
		const METHOD_NAME = "uploadRcrd()";
		log.debug(METHOD_NAME);

		const _generateRcrdData = (): void => {
			const SUB_METHOD_NAME = "_generateRcrdData()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			const upload_state = this.state.upload_state!;

			const file = this.state.file_list[upload_index];
			const file_state = upload_state.files[upload_index];

			const json: S4Rcrd = {
				version  : 3,
				keys     : {},
				burnDate : upload_state.burn_date
			};
	
			{ // metadata
	
				const metadata_obj: S4Rcrd_Metadata = {
					filename : file.name
				};
	
				const metadata_cleartext = JSON.stringify(metadata_obj, null, 0);
				// 
				// Todo: encrypt metadata
				// Need: Threeefish 512 support in JS
				//
				json.metadata = metadata_cleartext;
			}
			{ // key
	
				const key_id = `UID:${this.props.user_id}`;
	
				// 
				// Todo: encrypt key
				// Need: ECC 41417 support in JS
				//
				const key_cleartext_b64 = base64.fromByteArray(file_state.encryption_key);
	
				json.keys[key_id] = {
					perms : "rws",
					key   : key_cleartext_b64
				};
			}

			const rcrd_str = JSON.stringify(json, null, 0);

			// Next step
			_fetchCredentials({rcrd_str});
		}

		const _fetchCredentials = (
			state: {
				rcrd_str : string
			}
		): void =>
		{
			log.debug(`${METHOD_NAME} _fetchCredentials()`);

			credentials_helper.getCredentials((err, credentials)=> {

				if (credentials) {
					_performUpload({...state, credentials});
				}
				else {
					log.err("Error fetching anonymous AWS credentials: "+ err);
					_fail();
				}
			});
		}

		const _performUpload = (
			state: {
				rcrd_str    : string,
				credentials : AWSCredentials
			}
		): void =>
		{
			const SUB_METHOD_NAME = "_performUpload()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			const upload_state = this.state.upload_state!;

			const file = this.state.file_list[upload_index];
			const file_state = upload_state.files[upload_index];

			const key = this.getStagingPathForFile({upload_state, file_state, file, ext: "rcrd"});

			const s3 = new S3({
				credentials : state.credentials,
				region      : 'us-west-2'
			});

			const upload = s3.upload({
				Bucket        : 'cloud.storm4.test',
				Key           : key,
				Body          : state.rcrd_str
			});

			upload.send((err, data)=> {

				if (err)
				{
					log.err(`${METHOD_NAME}.${SUB_METHOD_NAME}: s3.upload.send(): err: `+ err);
					_fail();
				}
				else
				{
					_succeed();
				}
			});
		}

		const _succeed = (
		): void =>
		{
			const SUB_METHOD_NAME = "_succeed()"
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			this.setState((current)=> {

				const next = _.cloneDeep(current) as ISendState;
				
				const upload_index = next.upload_index;
				const _file_state = next.upload_state!.files[upload_index];

				_file_state.has_uploaded_rcrd = true;
				
				return next;
				
			}, ()=> {

				this.uploadNext();
			});
		}

		const _fail = (upload_err_fatal?: string): void => {
			log.debug(`${METHOD_NAME}._fail()`);

			// Reserved for step-specific failure code
			
			this.uploadFail(upload_err_fatal);
		}

		_generateRcrdData();
	}

	protected uploadFile(
	): void
	{
		const METHOD_NAME = "uploadFile()";
		log.debug(`${METHOD_NAME}`);

		const _readThumbnail = (): void => {
			const SUB_METHOD_NAME = "_readThumbnail()"
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			const file = this.state.file_list[upload_index];

			// file.preview is a blob url.
			// For example: blob:http://localhost:3000/478850dc-08cf-4929-aa8a-af1890ac0350

			if (file.type.startsWith("image/") == false || file.preview == null)
			{
				_determineMultipart(null);
				return;
			}

			const img = new Image()!;
			img.onload = (event)=> {

				const MAX_THUMBNAIL_SIZE = 512;

				let width = img.width;
				let height = img.height;

				if (width > MAX_THUMBNAIL_SIZE || height > MAX_THUMBNAIL_SIZE)
				{
					const scale = MAX_THUMBNAIL_SIZE / Math.max(width, height);

					width *= scale;
					height *= scale;
				}

				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				
				const ctx = canvas.getContext('2d')!;
				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob((blob)=> {
					
					if (blob == null)
					{
						_determineMultipart(null);
						return;
					}

					const file_stream = new FileReader();
					file_stream.addEventListener("loadend", ()=>{

						const file_preview = file_stream.result as ArrayBuffer|null;

						// Next step
						_determineMultipart(file_preview);
					});
					file_stream.readAsArrayBuffer(blob);
					
				}, "image/jpeg", 0.5); // same JPEG quality settings as macOS/iOS
			};
			img.src = file.preview;
		}

		const _determineMultipart = (
			file_preview: ArrayBuffer|null
		): void =>
		{
			const SUB_METHOD_NAME = "_determineMultipart()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			
			const file = this.state.file_list[upload_index];
			const file_state = this.state.upload_state!.files[upload_index];

			let multipart_state: UploadState_Multipart|null = null;

			// Should we use multipart to upload the file ?
			// 
			// AWS has some restrictions here we need to be aware of.
			//
			// - each part (excluding the last) must be >= 5 MiB
			// - there can be at most 10,000 parts

			const encrypted_file_size = this.getEncryptedFileSize({file, file_state});
			log.debug("encrypted_file_size: "+ encrypted_file_size)

			// What is the cutover point for switching to mulitpart ?
			// 
			// - 5 MiB is absolute MINIMUM (anything smaller not allowed by AWS)
			// - We can detect if the user is on mobile...
			// - But we don't know what the user's actual upload speed is
			//
			const MULTIPART_CUTOVER = (1024 * 1024 * 10);

			if (encrypted_file_size >= MULTIPART_CUTOVER)
			{
				let part_size = (1024 * 1024 * 5);
				let num_parts = Math.ceil(file.size / part_size);

				while (num_parts > 10000)
				{
					part_size += (1024 * 1024 * 1);
					num_parts = Math.ceil(file.size / part_size);
				}

				multipart_state = {
					part_size,
					num_parts,
					upload_id     : null,
					current_part  : 0,
					progress      : {},
					eTags         : {}
				};

				log.err(`${METHOD_NAME}.${SUB_METHOD_NAME}: multipart_state: ${multipart_state}`);
			}
			else
			{
				log.err(`${METHOD_NAME}.${SUB_METHOD_NAME}: wtf C`);
			}

			// Go through setState so the UI will update
			// 
			this.setState((current)=> {

				const next = _.cloneDeep(current) as ISendState;

				const _file_state = next.upload_state!.files[next.upload_index];

				if (file_preview) {
					_file_state.file_preview = file_preview;
				}
				else {
					_file_state.file_preview = new ArrayBuffer(0);
				}

				_file_state.multipart_state = multipart_state || undefined;

				return next;

			}, ()=> {

				if (file.preview) {
					window.URL.revokeObjectURL(file.preview);
				}

				// Next step
				_dispatch();
			});
		}

		const _dispatch = () => {
			const SUB_METHOD_NAME = "_dispatch()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			const file_state = this.state.upload_state!.files[upload_index];

			if (file_state.multipart_state) {
				this.uploadFile_multipart();
			}
			else {
				log.err(`${METHOD_NAME}.${SUB_METHOD_NAME}: file_state: ${JSON.stringify(file_state, null, 2)}`);
				this.uploadFile_unipart()
			}
		}

		{ // Scoping

			const upload_index = this.state.upload_index;
			const file_state = this.state.upload_state!.files[upload_index];

			if (file_state.file_preview == null) {
				_readThumbnail();
			}
			else {
				_dispatch();
			}
		}
	}

	protected uploadFile_unipart(
	): void
	{
		const METHOD_NAME = "uploadFile_unipart()";
		log.debug(`${METHOD_NAME}`);

		const _readFile = (): void => {
			const SUB_METHOD_NAME = "_readFile()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			const file: ImageFile = this.state.file_list[upload_index];			

			const file_stream = new FileReader();
			file_stream.addEventListener("loadend", ()=>{

				const file_data = file_stream.result as ArrayBuffer|null;
				if (file_data == null) {
					_fail(`Unable to read file: ${file.name}`);
				}
				else {
					_fetchCredentials({file_data})
				}
			});

			file_stream.readAsArrayBuffer(file);
		}

		const _fetchCredentials = (
			state: {
				file_data : ArrayBuffer
			}
		): void =>
		{
			log.debug(`${METHOD_NAME}._fetchCredentials()`);

			credentials_helper.getCredentials((err, credentials)=> {

				if (credentials) {
					_performUpload({...state, credentials});
				}
				else {
					log.err("Error fetching anonymous AWS credentials: "+ err);
					_fail();
				}
			});
		}

		const _performUpload = (
			state: {
				file_data    : ArrayBuffer,
				credentials  : AWSCredentials
			}
		): void =>
		{
			const SUB_METHOD_NAME = "_performUpload()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			const file: ImageFile = this.state.file_list[upload_index];			
			
			const upload_state = this.state.upload_state!;
			const file_state = upload_state.files[upload_index];

			const {file_preview} = file_state;
			const {file_data} = state;

			const file_header = util.makeCloudFileHeader({
				byteLength_metadata  : 0,
				byteLength_thumbnail : (file_preview == null) ? 0 : file_preview.byteLength,
				byteLength_data      : file_data.byteLength
			});

			const body = util.concatBuffers([file_header, file_preview, file_data]);

			const key = this.getStagingPathForFile({upload_state, file_state, file, ext: "data"});
			
			const s3 = new S3({
				credentials : state.credentials,
				region      : 'us-west-2'
			});

			const upload = s3.putObject({
				Bucket : 'cloud.storm4.test',
				Key    : key,
				Body   : body,
			});

			upload.on("httpUploadProgress", (progress)=> {

				const upload_progress = (progress.loaded / progress.total);
				this.setState((current)=> {
					const next = _.cloneDeep(current) as ISendState;
					next.upload_state!.files[upload_index].unipart_progress = upload_progress;

					return next;
				});
			});

			upload.send((err, data)=> {

				if (err)
				{
					log.err("s3.upload.send(): err: "+ err);

					_fail();
					return;
				}
				
				// Next step
				_succeed();
			});
		};

		const _succeed = (): void => {
			log.err(`${METHOD_NAME}._succeed()`);
			
			this.setState((current)=> {
				
				const next = _.cloneDeep(current) as ISendState;
				next.upload_index++;

				return next;

			}, ()=> {

				this.uploadNext();
			});
		}

		const _fail = (upload_err_fatal?: string): void => {
			log.debug(`${METHOD_NAME}._fail()`);

			// Reserved for step-specific failure code
			
			this.uploadFail(upload_err_fatal);
		}

		_readFile();
	}

	protected uploadFile_multipart(
	): void
	{
		const METHOD_NAME = "uploadFile_multipart()";
		log.debug(`${METHOD_NAME}`);

		const upload_index = this.state.upload_index;
		const upload_state = this.state.upload_state!;

		const file_state = upload_state.files[upload_index];
		const multipart_state = file_state.multipart_state!;

		if (multipart_state.upload_id == null)
		{
			this.uploadFile_multipart_initialize()
		}
		else
		{
			// Look for remaining parts we still need to upload.

			const parts_done: number[] = [];
			const parts_flight: number[] = [];
			const parts_available: number[] = [];

			for (let i = 0; i < multipart_state.num_parts; i++)
			{
				if (multipart_state.eTags[i] != null) {
					// Part is already uploaded
					parts_done.push(i);
				}
				else if (multipart_state.progress[i] != null) {
					// Part is being uploaded currently
					parts_flight.push(i);
				}
				else {
					parts_available.push(i);
				}
			}

			log.debug(`${METHOD_NAME}: parts_flight: ${parts_flight}`);
			log.debug(`${METHOD_NAME}: parts_available: ${parts_available}`);

			if (parts_available.length > 0)
			{
				// We still have parts that need uploading.

				let max_concurrency: number;
				if (multipart_state.num_parts < 5)
				{
					// If there's a small number of parts,
					// it may not make sense to upload multiple parts at the same time.
					// 
					// For example, consider the situation when there are exactly 2 parts.
					// If we upload both parts at the same time, then we're defeating
					// the primary reason of using multipart (resumeability).

					max_concurrency = 1;
				}
				else {
					max_concurrency = this.isProbablyMobile() ? 1 : 2;
				}

				const SLOTS = max_concurrency - parts_flight.length;

				for (let i = 0; i < SLOTS && i < parts_available.length; i++)
				{
					const part_index = parts_available[i];

					this.uploadFile_multipart_part(part_index);
				}
			}
			else if ((parts_flight.length == 0) && (parts_done.length == multipart_state.num_parts))
			{
				// We're ready to complete the multipart upload

				this.uploadFile_multipart_complete();
			}
		}
	}

	protected uploadFile_multipart_initialize(
	): void
	{
		const METHOD_NAME = "uploadFile_multipart_initialize()";
		log.debug(METHOD_NAME);

		const _fetchCredentials = (): void => {
			log.debug(`${METHOD_NAME}._fetchCredentials()`);

			credentials_helper.getCredentials((err, credentials)=> {

				if (credentials) {
					_performRequest({credentials});
				}
				else {
					log.err("Error fetching anonymous AWS credentials: "+ err);
					_fail();
				}
			});
		}

		const _performRequest = (
			state: {
				credentials: AWSCredentials
			}
		): void =>
		{
			log.debug(`${METHOD_NAME}._performRequest()`);

			const upload_index = this.state.upload_index;
			const upload_state = this.state.upload_state!;

			const file = this.state.file_list[upload_index];
			const file_state = upload_state.files[upload_index];

			const key = this.getStagingPathForFile({upload_state, file_state, file, ext: "data"});

			const s3 = new S3({
				credentials : state.credentials,
				region      : 'us-west-2'
			});

			s3.createMultipartUpload({
				Bucket : 'cloud.storm4.test',
				Key    : key
			
			}, (err, data)=> {

				if (err)
				{
					log.err("${METHOD_NAME}: s3.createMultipartUpload(): err: "+ err);

					_fail();
					return;
				}

				const upload_id = data.UploadId;

				if (upload_id)
				{
					_succeed(upload_id);
				}
				else
				{
					log.err("${METHOD_NAME}: s3.createMultipartUpload(): unable to extract upload_id !");
					_fail();
				}
			});
		}

		const _succeed = (
			upload_id: string
		): void =>
		{
			log.err(`${METHOD_NAME}._succeed()`);
			
			this.setState((current)=> {
				
				const next = _.cloneDeep(current) as ISendState;
				
				const upload_index = next.upload_index;
				const multipart_state = next.upload_state!.files[upload_index].multipart_state!;

				multipart_state.upload_id = upload_id;

				return next;

			}, ()=> {

				this.uploadNext();
			});
		}

		const _fail = (upload_err_fatal?: string): void => {
			log.debug(`${METHOD_NAME}._fail()`);

			// Reserved for step-specific failure code

			this.uploadFail(upload_err_fatal);
		}

		_fetchCredentials();
	}

	protected uploadFile_multipart_part(
		part_index: number
	): void
	{
		const METHOD_NAME = `uploadFile_multipart_part(${part_index})`;
		log.debug(METHOD_NAME);

		const _readChunk = (): void =>
		{
			log.debug(`${METHOD_NAME}._readChunk()`);

			const upload_index = this.state.upload_index;
			const file = this.state.file_list[upload_index];
			const file_state = this.state.upload_state!.files[upload_index];
			const multipart_state = file_state.multipart_state!;

			const file_stream = new FileReader();
			file_stream.addEventListener("loadend", ()=>{

				const file_data = file_stream.result as ArrayBuffer|null;
				if (file_data == null) {
					_fail(`Unable to read file: ${file.name}`);
				}
				else {
					_fetchCredentials({file_data})
				}
			});

			const headerSize = 64;

			const thumbnail = file_state.file_preview;
			const thumbnailSize = thumbnail ? thumbnail.byteLength : 0;

			const offset = headerSize + thumbnailSize;

			const slice_start = offset + (multipart_state.part_size * part_index);
			const slice_end = Math.min(slice_start + multipart_state.part_size, file.size);

			file_stream.readAsArrayBuffer(file.slice(slice_start, slice_end));
		}

		const _fetchCredentials = (
			state: {
				file_data : ArrayBuffer
			}
		): void =>
		{
			log.debug(`${METHOD_NAME}._fetchCredentials()`);

			credentials_helper.getCredentials((err, credentials)=> {

				if (credentials) {
					_performUpload({...state, credentials});
				}
				else {
					log.err("Error fetching anonymous AWS credentials: "+ err);
					_fail();
				}
			});
		}

		const _performUpload = (
			state: {
				file_data   : ArrayBuffer,
				credentials : AWSCredentials
			}
		): void =>
		{
			const SUB_METHOD_NAME = "_performUpload()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			const file = this.state.file_list[upload_index];
			const upload_state = this.state.upload_state!;
			const file_state = upload_state.files[upload_index];
			const multipart_state = file_state.multipart_state!;

			let body: Uint8Array;
			if (part_index > 0) {
				body = new Uint8Array(state.file_data);
			}
			else {
				const header = util.makeCloudFileHeader({
					byteLength_metadata  : 0,
					byteLength_thumbnail : file_state.file_preview ? file_state.file_preview.byteLength : 0,
					byteLength_data      : file.size
				});
				
				body = util.concatBuffers([header, file_state.file_preview, state.file_data])
			}

			const key = this.getStagingPathForFile({upload_state, file_state, file, ext: "data"});

			const s3 = new S3({
				credentials : state.credentials,
				region      : 'us-west-2'
			});

			const upload = s3.uploadPart({
				Bucket     : 'cloud.storm4.test',
				Key        : key,
				PartNumber : part_index+1, // <= not zero-based: [1, 10,000]
				UploadId   : multipart_state.upload_id!,
				Body       : body
			});
			
			upload.on("httpUploadProgress", (progress)=> {

				const upload_progress = (progress.loaded / progress.total);
				this.setState((current)=>{
					const next = _.cloneDeep(current) as ISendState;
					next.upload_state!.files[upload_index].multipart_state!.progress[part_index] = upload_progress;

					return next;
				});
			});
		
			upload.send((err, data)=> {

				if (err)
				{
					log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}: err: `+ err);

					_fail();
					return;
				}

				log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}: DONE !`);
				const eTag = data.ETag;

				if (eTag == null)
				{
					log.err("${METHOD_NAME}: s3.createMultipartUpload(): unable to extract upload_id !");

					_fail();
					return;
				}

				this.setState((current)=> {
					const next = _.cloneDeep(current) as ISendState;

					const _multipart_state = next.upload_state!.files[upload_index].multipart_state!;

					_multipart_state.progress[part_index] = 1.0;
					_multipart_state.eTags[part_index] = eTag;

					return next;

				}, ()=> {

					this.uploadNext();
				});
			});
		}

		const _fail = (upload_err_fatal?: string): void => {
			log.debug(`${METHOD_NAME}._fail()`);

			const upload_index = this.state.upload_index;
			const multipart_state = this.state.upload_state!.files[upload_index].multipart_state!;

			// Step-specific failure code
			multipart_state.progress[part_index] = undefined;

			this.uploadFail(upload_err_fatal);
		}

		{ // Scoping

			const upload_index = this.state.upload_index;
			const multipart_state = this.state.upload_state!.files[upload_index].multipart_state!;

			multipart_state.progress[part_index] = 0;

			_readChunk();
		}
	}

	protected uploadFile_multipart_complete(
	): void
	{
		const METHOD_NAME = "uploadFile_multipart_complete()";
		log.debug(METHOD_NAME);

		// We do NOT use the S3 API to complete the multipart upload.
		// Because it sucks.
		// 
		// If you use S3, then the response might get lost.
		// Which we are unable to recover from .
		// 
		// We use our own API to get around this problem.

		const _generateJSON = (): void => {
			const SUB_METHOD_NAME = "_generateRcrdData()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const upload_index = this.state.upload_index;
			const upload_state = this.state.upload_state!;

			const file = this.state.file_list[upload_index];

			const file_state = upload_state.files[upload_index];
			const multipart_state = file_state.multipart_state!;

			const key = this.getStagingPathForFile({upload_state, file_state, file, ext: "data"});

			const parts: string[] = [];
			for (let i = 0; i < multipart_state.num_parts; i++)
			{
				const eTag = multipart_state.eTags[i];
				parts.push(eTag || "");
			}

			const json: S4MultipartCompleteRequest = {
				bucket       : 'cloud.storm4.test',
				staging_path : key,
				upload_id    : multipart_state.upload_id || "",
				parts        : parts
			};

			const json_str = JSON.stringify(json, null, 0);

			// Next step
			_fetchCredentials({json_str});
		}

		const _fetchCredentials = (
			state: {
				json_str : string
			}
		): void =>
		{
			log.debug(`${METHOD_NAME} _fetchCredentials()`);

			credentials_helper.getCredentials((err, credentials)=> {

				if (credentials) {
					_performUpload({...state, credentials});
				}
				else {
					log.err("Error fetching anonymous AWS credentials: "+ err);
					_fail();
				}
			});
		}

		const _performUpload = (
			state: {
				json_str    : string,
				credentials : AWSCredentials
			}
		): void =>
		{
			const SUB_METHOD_NAME = "_performUpload()";
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			const host = api_gateway.getHost();
			const path = api_gateway.getPath("/multipartComplete");

			const url = `https://${host}${path}`;

			const options = aws4.sign({
				host   : host,
				path   : path,
				method : 'POST',
				body   : state.json_str,
				headers : {
					"Content-Type": "application/json"
				}

			}, state.credentials);

			log.debug(`aws4.sign() => `+ JSON.stringify(options, null, 2));

			fetch(url, options).then((response)=> {

				if (response.status == 200) {
					return response.json();
				}
				else {
					throw new Error("Server returned status code: "+ response.status);
				}

			}).then((json)=> {

				const response = json as S4MultipartCompleteResponse;

				log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}: response: `+ JSON.stringify(response, null, 2));
				
				if (response.status_code == 200) {
					_succeed();
				}
				else {
					log.err(`${METHOD_NAME}.${SUB_METHOD_NAME}: response.status_code: `+ response.status_code);
					_fail();
				}

			}).catch((err)=> {

				log.err(`${METHOD_NAME}.${SUB_METHOD_NAME}: err: `+ err);

				_fail();
			});
		}

		const _succeed = (
		): void =>
		{
			const SUB_METHOD_NAME = "_succeed()"
			log.debug(`${METHOD_NAME}.${SUB_METHOD_NAME}`);

			this.setState((current)=> {

				const next = _.cloneDeep(current) as ISendState;
				next.upload_index++;
				
				return next;
				
			}, ()=> {

				this.uploadNext();
			});
		}

		const _fail = (upload_err_fatal?: string): void => {
			log.debug(`${METHOD_NAME}._fail()`);

			// Reserved for step-specific failure code
			
			this.uploadFail(upload_err_fatal);
		}

		_generateJSON();
	}

	protected uploadFiles_pollStatus(
		in_state: {
			upload_state : UploadState
		}
	): void
	{
		const METHOD_NAME = "uploadFiles_pollStatus()";
		log.debug(`${METHOD_NAME}`);

		

		this.setState((current)=> {

			const next = _.cloneDeep(current) as ISendState;
			if (next.upload_state)
			{
				for (const file_state of next.upload_state.files)
				{
					file_state.cloud_id = "fake_it_til_we_make_it";
				}

				next.upload_state.done_polling = true;
			}

			return next;

		}, ()=> {

			this.uploadNext();
		});
	}

	protected uploadMessage(
		in_state: {
			upload_state : UploadState
			msg_state    : UploadState_Msg
		}
	): void
	{
		const METHOD_NAME = "uploadMessage()";
		log.debug(`${METHOD_NAME}`);

		const {upload_state, msg_state} = in_state;
		
		const _generateRcrdData = (): void => {
			log.debug(`${METHOD_NAME}._generateRcrdData()`);

			const json: S4Rcrd = {
				version  : 3,
				keys     : {},
				burnDate : upload_state.burn_date
			};
	
			{ // data
	
				const data_obj: S4Rcrd_Data_Message = {
					version     : 1,
					type        : "ephemeral",
					attachments : []
				};

				let index = 0;
				for (const file_state of upload_state.files)
				{
					const cloudPath = this.getCloudPath(file_state);
					const filename = this.state.file_list[index].name;

					data_obj.attachments.push(make_attachment({
						cloudPath   : cloudPath,
						cloudFileID : file_state.cloud_id!,
						filename    : filename
					}));

					index++;
				}
	
				const data_cleartext = JSON.stringify(data_obj, null, 0);
				// 
				// Todo: encrypt metadata
				// Need: Threeefish 512 support in JS
				//
				json.data = data_cleartext;
			}
			{ // key
	
				const key_id = `UID:${this.props.user_id}`;
	
				// 
				// Todo: encrypt key
				// Need: ECC 41417 support in JS
				//
				const key_cleartext_b64 = base64.fromByteArray(msg_state.encryption_key);
	
				json.keys[key_id] = {
					perms : "rws",
					key   : key_cleartext_b64
				};
			}

			const rcrd_str = JSON.stringify(json, null, 0);

			// Next step
			_fetchCredentials({rcrd_str});
		}

		const _fetchCredentials = (
			state: {
				rcrd_str: string
			}
		): void =>
		{
			log.debug(`${METHOD_NAME}._fetchCredentials()`);

			credentials_helper.getCredentials((err, credentials)=> {

				if (credentials) {
					_performUpload({...state, credentials});
				}
				else {
					log.err("Error fetching anonymous AWS credentials: "+ err);
					_fail();
				}
			});
		}

		const _performUpload = (
			state: {
				rcrd_str    : string,
				credentials : AWSCredentials
			}
		): void =>
		{
			log.debug(`${METHOD_NAME}._performUpload()`);

			const key = this.getStagingPathForMsg({upload_state, msg_state});

			const s3 = new S3({
				credentials : state.credentials,
				region      : 'us-west-2'
			});

			const upload = s3.upload({
				Bucket        : 'cloud.storm4.test',
				Key           : key,
				Body          : state.rcrd_str
			});

			upload.send((err, data)=> {

				if (err)
				{
					log.err("s3.upload.send(): err: "+ err);
					_fail();
				}
				else
				{
					_succeed();
				}
			});
		}

		const _succeed = (
			): void =>
		{
			log.err(`${METHOD_NAME}._succeed()`);

			this.setState((current)=> {

				const next = _.cloneDeep(current) as ISendState;
				if (next.upload_state && next.upload_state.msg)
				{
					next.upload_state.msg.has_uploaded_rcrd = true;
				}
				next.upload_success = true;

				return next;
				
			}, ()=> {

				// Done !
			});
		}

		const _fail = (upload_err_fatal?: string): void => {
			log.debug(`${METHOD_NAME}._fail()`);

			// Reserved for step-specific failure code
			
			this.uploadFail(upload_err_fatal);
		}

		_generateRcrdData();
	}

	protected uploadMessage_pollStatus(): void
	{
		const METHOD_NAME = "uploadMessage_pollStatus()";
		log.debug(`${METHOD_NAME}`);

		// Todo...

		this.setState({
			upload_success: true
		});
	}

	protected uploadFail(
		upload_err_fatal ?: string
	): void
	{
		log.err(`uploadFail()`);

		if (upload_err_fatal)
		{
			this.setState({
				upload_err_fatal
			});
		}
		else
		{
			this.setState({
				upload_err_retry: 90

			}, ()=> {

				if (this.retry_timer) {
					clearInterval(this.retry_timer);
				}

				this.retry_start = Date.now();
				this.retry_timer = setInterval(this.onRetryTimerTick, 1000);
			});
		}
	}

	public renderUserProfile(): React.ReactNode|React.ReactFragment {
		const state = this.state;
		const {classes} = this.props;

		if (state.is_fetching_user_profile)
		{
			return (
				<div className={classes.section_identity}>
					<Avatar className={classes.section_identity_avatar}>
						<AccountCircleIcon className={classes.section_identity_avatar_img}/>
					</Avatar>
					<div className={classes.section_identity_fetching}>
						<CircularProgress
							className={classes.section_identity_fetching_progress}
							color="primary"
							size={16}
						/>
						<Typography variant="headline">
							{'Fetching user...'}
						</Typography>
					</div>
				</div>
			);
		}
		else if (state.user_profile_err_msg)
		{
			return (
				<div className={classes.section_identity}>
					<Typography variant="headline">
						{state.user_profile_err_msg}
					</Typography>
				</div>
			);
		}
		else if (state.user_profile)
		{
			const user_profile = state.user_profile;
			const identities = user_profile.auth0.identities;

			const selected_identityIdx = this.getIdentityIdx();
			const selected_identity = identities[selected_identityIdx];

			const selected_idpUrl = util.imageUrlForIdentityProvider_signin(selected_identity);
			const selected_idUrl = util.imageUrlForIdentity(selected_identity, user_profile.s4);
			const selected_displayName = util.displayNameForIdentity(selected_identity, user_profile.s4);

			let section_identitiesButton: React.ReactNode|null = null;
			if (identities.length > 1)
			{
				section_identitiesButton = (
					<Tooltip title="Show all identities linked to user's account.">
						<IconButton onClick={this.userIdentsMenuButtonClicked}>
							<Badge badgeContent={identities.length} color="primary">
								<MoreVertIcon />
							</Badge>
						</IconButton>
					</Tooltip>
				);
			}

			const section_identity = (
				<div className={classes.section_identity}>
					<Avatar className={classes.section_identity_avatar}>
						<ReactImageFallback
							src={selected_idUrl || undefined}
							initialImage={
								<AccountCircleIcon color="primary" className={classes.section_identity_avatar_img}/>
							}
							fallbackImage={
								<AccountCircleIcon color="primary" className={classes.section_identity_avatar_img}/>
							}
							width={AVATAR_SIZE}
							height={AVATAR_SIZE}
						/>
					</Avatar>
					<div className={classes.section_identity_nameAndProvider}>
						<Typography variant="headline" className={classes.section_identity_name}>
							{selected_displayName}
						</Typography>
						<img src={selected_idpUrl} height="22" className={classes.identityProviderImg}/>
					</div>
					{section_identitiesButton}
				</div>
			);

			const section_menu = (
				<Menu
					anchorEl={state.userIdentsMenuAnchor}
					open={state.userIdentsMenuOpen}
					onClose={this.userIdentsMenuClosed}
				>
				{identities.map((identity, index) => {

					const idpUrl = util.imageUrlForIdentityProvider_64(identity);
					const idUrl = util.imageUrlForIdentity(identity, user_profile.s4);
					const displayName = util.displayNameForIdentity(identity, user_profile.s4);

					const onClick = this.userIdentsMenuItemSelected.bind(this, index);

					return (
						<MenuItem
							key={`${identity.user_id}`}
							selected={selected_identityIdx == index}
							onClick={onClick}
						>
							<ListItemIcon>
								 <img src={idpUrl} width="32" height="32" />
							</ListItemIcon>
							<ListItemIcon>
								<Avatar className={classes.listItemIcon_avatar}>
									<ReactImageFallback
										src={idUrl || undefined}
										initialImage={
											<AccountCircleIcon className={classes.listItemIcon_avatar_img} color="primary"/>
										}
										fallbackImage={
											<AccountCircleIcon className={classes.listItemIcon_avatar_img} color="primary"/>
										}
										width={32}
										height={32}
									/>
								</Avatar>
							</ListItemIcon>
							<ListItemText
								className={classes.listItemText}
								inset={true}
								primary={displayName}
							/>
						</MenuItem>
					);
				})}
				</Menu>
			);

			return (
				<React.Fragment>
					{section_identity}
					{section_menu}
				</React.Fragment>
			);
		}
		else
		{
			return (
				<div className={classes.section_identity}></div>
			);
		}
	}

	public renderExpansionPanel1(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const user_id = this.props.user_id;
		const user_profile = state.user_profile;
		const pub_key = state.public_key;

		let displayName = user_id;
		if (user_profile)
		{
			const identityIdx = this.getIdentityIdx();
			const identity = user_profile.auth0.identities[identityIdx];

			displayName = util.displayNameForIdentity(identity, user_profile.s4);
		}

		const profileUrl = util.profileUrlForUser(user_id);

		let pubKeyUrl: string|null = null;
		if (user_profile) {
			pubKeyUrl = util.pubKeyUrlForUser(user_profile.s4);
		}

		let section_summary: React.ReactNode;
		if (state.is_fetching_public_key)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Fetching user's public key..."}
					</Typography>
				</div>
			);
		}
		else if (state.public_key_err_msg)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<ReportProblemIcon color="error"/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{state.public_key_err_msg || "Generic error message"}
					</Typography>
				</div>
			);
		}
		else
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CheckCircleIcon nativeColor='green' />
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Fetched user's public key"}
					</Typography>
				</div>
			);
		}

		let section_li_pubKey;
		if (pubKeyUrl) {
			section_li_pubKey = (
				<li>
					The user's public key is <a href={pubKeyUrl} className={classes.a_noLinkColor}>here</a>.
				</li>
			)
		}

		let section_pubKeyDetails: React.ReactFragment|null = null;
		if (pub_key)
		{
			section_pubKeyDetails = (
				<React.Fragment>
					<Typography paragraph={true}>
						Public Key Details
					</Typography>
					<Typography component="ul" paragraph={true}>
						<li>Type: ECC {pub_key.keySuite}</li>
						<li className={classes.wrap}>Value <span className={classes.gray}>(Base64)</span>: {pub_key.pubKey}</li>
					</Typography>
				</React.Fragment>
			);
		}

		const section_details = (
			<div className={classes.section_expansionPanel_details}>
				<Typography paragraph={true}>
					Every Storm4 user has a public/private key pair.
					The private key is known <span className={classes.span_underline}>ONLY</span> to
					the user. (The server does not know it.)
				</Typography>
				<Typography paragraph={true}>
					We're going to use the public key when encrypting the file. 
					This ensures that only "{displayName}" can decrypt it.
					The file is encrypted in your browser, and then the encrypted
					version is uploaded to the cloud.
				</Typography>
				<Typography component="ul" paragraph={true}>
					<li>
						The user's public profile is <a href={profileUrl} className={classes.a_noLinkColor}>here</a>.
					</li>
					{section_li_pubKey}
				</Typography>
				<Typography paragraph={true}>
					Crypto Details:
				</Typography>
				<Typography paragraph={true} className={classes.indented}>
					A random 512-bit key is generated within the browser,
					and is then used to encrypt the file
					using <a href="https://en.wikipedia.org/wiki/Threefish" className={classes.a_noLinkColor}>Threefish</a>.
					The file's encryption key is then encrypted to the user's public key,
					and then both blobs (the encrypted file & the encrypted key) are
					uploaded to the cloud.
				</Typography>
				{section_pubKeyDetails}
			</div>
		);

		return (
			<ExpansionPanel>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
					{section_summary}
				</ExpansionPanelSummary>
				<ExpansionPanelDetails>
					{section_details}
				</ExpansionPanelDetails>
			</ExpansionPanel>
		);
	}

	public renderExpansionPanel2(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const user_id = this.props.user_id;
		const user_profile = state.user_profile;

		const user_id_hex = util.userID2Hex(user_id);

		const merkle_tree_root = state.merkle_tree_root;

		let section_summary: React.ReactNode;
		if (state.is_fetching_merkle_tree_root || state.is_fetching_merkle_tree_file)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{state.is_fetching_merkle_tree_root
							? "Fetching blockchain verification (1 of 2)..."
							: "Fetching blockchain verification (2 of 2)..."}
					</Typography>
				</div>
			);
		}
		else if (state.merkle_tree_root_err_msg || state.merkle_tree_file_err_msg)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<ReportProblemIcon color="error"/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{state.merkle_tree_root_err_msg || state.merkle_tree_file_err_msg}
					</Typography>
				</div>
			);
		}
		else if (merkle_tree_root != null)
		{
			if (merkle_tree_root.length == 0)
			{
				section_summary = (
					<div className={classes.section_expansionPanel_summary}>
						<ReportProblemIcon nativeColor="yellow"/>
						<Typography className={classes.section_expansionPanel_summary_text}>
							{"Public key not posted to blockchain yet"}
						</Typography>
					</div>
				);
			}
			else
			{
				section_summary = (
					<div className={classes.section_expansionPanel_summary}>
						<CheckCircleIcon nativeColor='green' />
						<Typography className={classes.section_expansionPanel_summary_text}>
							{"Fetched blockchain verification"}
						</Typography>
					</div>
				);
			}
		}
		else
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Initializing..."}
					</Typography>
				</div>
			);
		}

		const rpc_data = JSON.stringify(util.rpcJSON(user_id), null, 0);
		const rpc_url = util.rpcURL();
		const rpc_call =
			`curl -X POST -H "Content-Type: application/json" -d '${rpc_data}' ${rpc_url}`;

		let contract_response: string;
		let merkle_tree_url: string;
		if (merkle_tree_root == null) {
			contract_response = "fetching...";
			merkle_tree_url   = "fetching...";
		}
		else if (merkle_tree_root.length == 0) {
			contract_response = "not available (user not on blockchain yet)";
			merkle_tree_url   = "not available (user not on blockchain yet)";
		}
		else {
			contract_response = merkle_tree_root;
			merkle_tree_url = util.merkleTreeFileURL(merkle_tree_root);
		}

		const section_details = (
			<div className={classes.section_expansionPanel_details}>
				<Typography paragraph={true}>
					Storm4 uses the <a href="https://www.ethereum.org/" className={classes.a_noLinkColor}>Ethereum</a> blockchain
					to independently verify the user's public key. This protects you from
					hackers and related man-in-the-middle problems. Read more about it on
					our <a href="https://www.storm4.cloud/blockchain.html" className={classes.a_noLinkColor}>website</a>.
				</Typography>
				<Typography paragraph={true} component="blockquote" className={classes.blockquote}>
					Ethereum is a decentralized platform that runs smart contracts: applications that
					run exactly as programmed without any possibility of downtime, censorship, fraud
					or third party interference.
				</Typography>
				<Typography paragraph={true}>
					We wrote and deployed a smart contract that stores the user's public key
					information on the blockchain. And it's written in such a way that
					allows the public key info to be written once & only once.
					Since the smart contract itself is immutable (due to the nature of Ethereum),
					this creates an immutable record of the public key. Thus the keys of Storm4
					users are immutable, verifiable, auditable & tamper-proof.
				</Typography>
				<Typography component="ul" paragraph={true}>
					<li>Smart contract: <a href="https://etherscan.io/address/0xf8cadbcadbeac3b5192ba29df5007746054102a4#code" className={classes.a_noLinkColor}>deployed code</a></li>
					<li>User ID <span className={classes.gray}>(zBase32)</span>: {user_id}</li>
					<li>User ID <span className={classes.gray}>(hex)</span>: {user_id_hex}</li>
					<li>
						RPC Call:
						<ul className={classes.sub_ul}>
							<li className={classes.sub_ul_li}>
								{rpc_call}
							</li>
						</ul>
					</li>
					<li>Contract Call:
						<ul className={classes.sub_ul}>
							<li className={classes.sub_ul_li}>
								getMerkleTreeRoot({user_id_hex}, 0)
							</li>
							<li className={classes.sub_ul_li}>
								<a href="https://etherscan.io/address/0xf8cadbcadbeac3b5192ba29df5007746054102a4#readContract" className={classes.a_noLinkColor} target="_blank">
									try it yourself
								</a>
							</li>
						</ul>
					</li>
					<li>
						Contract Response:
						<ul className={classes.sub_ul}>
							<li className={classes.sub_ul_li}>
								{contract_response}
							</li>
						</ul>
					</li>
				</Typography>
				<Typography paragraph={true}>
					The smart contract associates a userID with a merkle tree root value.
					A <a href="https://en.wikipedia.org/wiki/Merkle_tree" className={classes.a_noLinkColor}>merkle tree</a> is
					a well known cryptographic data structure used to verify data sets.
					The location of the full merkle tree is derived from the root.
				</Typography>
				<Typography component="ul" paragraph={true}>
					<li className={classes.wrap}>
						Merkle Tree File: <a href={merkle_tree_url} className={classes.a_noLinkColor}>link</a>
					</li>
				</Typography>
				<Typography paragraph={true}>
					The merkle tree file contains the public key information for 1 or more users.
					By verifying the merkle tree file, we can verify that the user's public key
					has not been tampered with.
				</Typography>
			</div>
		);

		return (
			<ExpansionPanel>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
					{section_summary}
				</ExpansionPanelSummary>
				<ExpansionPanelDetails>
					{section_details}
				</ExpansionPanelDetails>
			</ExpansionPanel>
		);
	}

	public renderExpansionPanel3(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const user_id = this.props.user_id;

		const pub_key = state.public_key;
		const merkle_tree_root = state.merkle_tree_root;
		const merkle_tree_file = state.merkle_tree_file;

		let section_summary: React.ReactNode;
		if (state.is_verifying_public_key)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Verifying public key..."}
					</Typography>
				</div>
			);
		}
		else if (state.pubkey_tampering_detected)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<ReportProblemIcon color="error"/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Public key has been tampered with! File sending is disabled."}
					</Typography>
				</div>
			);
		}
		else if (_.isBoolean(state.pubkey_verifcation_success))
		{
			if (state.pubkey_verifcation_success == false)
			{
				section_summary = (
					<div className={classes.section_expansionPanel_summary}>
						<ReportProblemIcon nativeColor="yellow"/>
						<Typography className={classes.section_expansionPanel_summary_text}>
							{"Unable to verify public key"}
						</Typography>
					</div>
				);
			}
			else
			{
				section_summary = (
					<div className={classes.section_expansionPanel_summary}>
						<CheckCircleIcon nativeColor='green' />
						<Typography className={classes.section_expansionPanel_summary_text}>
							{"Public key verified"}
						</Typography>
					</div>
				);
			}
		}
		else
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Initializing..."}
					</Typography>
				</div>
			);
		}

		let section_details: React.ReactNode;
		if (pub_key && merkle_tree_root && merkle_tree_file)
		{
			const keyID_verification =
				`echo -n "${pub_key.pubKey}" | base64 --decode | openssl dgst -sha256 | cut -c -32 | xxd -r -p | base64`;

			const merkle_tree_url = util.merkleTreeFileURL(merkle_tree_root);

			let merkle_tree_value: string;
			{
				const values_idx = merkle_tree_file.lookup[user_id];
				if (values_idx == null || values_idx < 0 || values_idx >= merkle_tree_file.values.length)
				{
					merkle_tree_value = "Not found in merkle tree file !";
				}
				else
				{
					merkle_tree_value = merkle_tree_file.values[values_idx];
				}
			}

			section_details = (
				<div className={classes.section_expansionPanel_details}>
					<Typography paragraph={true}>
						Public key verification requires 5 steps:
					</Typography>
					<Typography component="ol" paragraph={true}>
						<li>
							Fetch the user's public key <span className={classes.gray}>(see above)</span>
						</li>
						<li>
							Fetch the merkle tree root from the blockchain <span className={classes.gray}>(see above)</span>
						</li>
						<li>
							Fetch the merkle tree file <span className={classes.gray}>(see above)</span>
						</li>
						<li>
							Ensure the user's public key is listed properly in the merkle tree
						</li>
						<li>
							Recalculate the merkle tree root, and ensure it matches the blockchain
						</li>
					</Typography>
					<Typography paragraph={true}>
						Information for steps 4 & 5:
					</Typography>
					<Typography component="ul" paragraph={true}>
						<li className={classes.wrap}>
							Public Key <span className={classes.gray}>(Base64)</span>: {pub_key.pubKey}
						</li>
						<li className={classes.wrap}>
							KeyID <span className={classes.gray}>(Base64)</span>: {pub_key.keyID}
						</li>
						<li className={classes.wrap}>
							KeyID Verification:
							<ul className={classes.sub_ul}>
								<li className={classes.sub_ul_li}>
									{keyID_verification}
								</li>
							</ul>
						</li>
					</Typography>
					<Typography component="ul" paragraph={true}>
						<li className={classes.wrap}>
							Merkle Tree File: <a href={merkle_tree_url} className={classes.a_noLinkColor}>link</a>
						</li>
						<li className={classes.wrap}>
							Merkle Tree Value: <span className={classes.gray}>(JSON)</span>: {merkle_tree_value}
						</li>
					</Typography>
					<Typography component="ul" paragraph={true}>
						<li className={classes.wrap}>
							Calculated Merkle Tree Root:
							<ul className={classes.sub_ul}>
								<li className={classes.sub_ul_li}>
									{state.calculated_merkle_tree_root || ""}
								</li>
							</ul>
						</li>
						<li className={classes.wrap}>
							Calculated With: <a href="https://github.com/devedge/merkle-tree-gen" className={classes.a_noLinkColor}>merkle-tree-gen</a>
						</li>
					</Typography>
				</div>
			);
		}
		else
		{
			section_details = (
				<div className={classes.section_expansionPanel_details}>
				</div>
			);
		}

		return (
			<ExpansionPanel>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
					{section_summary}
				</ExpansionPanelSummary>
				<ExpansionPanelDetails>
					{section_details}
				</ExpansionPanelDetails>
			</ExpansionPanel>
		);
	}

	public renderFileSelection(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const isMobile = this.isProbablyMobile();

		let description: React.ReactNode;
		if (this.isProbablyMobile())
		{
			description = (
				<div className={classes.dropZone_description_container}>
					<Typography
						align="center"
						variant="title"
					className={classes.dropZone_description_text_primary}>
						Tap to<br/>
						Select Files
					</Typography>
				</div>
			);
		}
		else
		{
			description = (
				<div className={classes.dropZone_description_container}>
					<Typography
						align="center"
						variant="title"
						className={classes.dropZone_description_text_primary}
					>
						Drag-n-Drop<br/>
						Files Here
					</Typography>
					<Typography
						align="center"
						variant="title"
						className={classes.dropZone_description_text_secondary}
					>
						or
					</Typography>
					<Typography
						align="center"
						variant="title"
						className={classes.dropZone_description_text_primary}
					>
						Click to<br/>
						Select Files
					</Typography>
				</div>
			);
		}

		return (
			<div className={classes.section_fileSelection}>
				<Dropzone
					onDrop={this.onDrop}
					disabled={this.state.pubkey_tampering_detected || false}
				>
					{description}
				</Dropzone>
			</div>
		);
	}

	public renderUploadInfo_err_fatal(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const fatal_msg = state.upload_err_fatal || "";

		return (
			<div className={classes.section_uploadInfo}>
				<div className={classes.uploadInfo_description_container}>
					<Typography
						align="center"
						variant="title"
						className={classes.uploadInfo_text}
					>
						Upload Failed
					</Typography>
					<Typography
						align="center"
						variant="subheading"
						className={classes.uploadInfo_text}
					>
						{fatal_msg}
					</Typography>
					<Button
						variant="contained"
						color="secondary"
						onClick={this.onStartOver}
						className={classes.uploadInfo_button}
					>Start Over</Button>
				</div>
			</div>
		);
	}

	public renderUploadInfo_err_retry(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const remaining = state.upload_err_retry || 0;

		let text: string;
		if (remaining == 1) {
			text = "Retrying in 1 second...";
		}
		else {
			text = `Retrying in ${remaining} seconds...`;
		}

		return (
			<div className={classes.section_uploadInfo}>
				<div className={classes.uploadInfo_description_container}>
					<Typography
						align="center"
						variant="title"
						className={classes.uploadInfo_text}
					>
						Upload Failed
					</Typography>
					<Typography
						align="center"
						variant="subheading"
						className={classes.uploadInfo_text}
					>
						Check internet connection.
					</Typography>
					<Typography
						align="center"
						variant="subheading"
						className={classes.uploadInfo_text_separate}
					>
						{text}
					</Typography>
					<Button
						variant="contained"
						color="secondary"
						onClick={this.onRetryNow}
						className={classes.uploadInfo_button}
					>Retry Now</Button>
				</div>
			</div>
		);
	}

	public renderUploadInfo_success(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		return (
			<div className={classes.section_uploadInfo}>
				<div className={classes.uploadInfo_description_container}>
					<Typography
						align="center"
						variant="title"
						className={classes.uploadInfo_text}
					>
						Upload Complete
					</Typography>
					<CheckCircleIcon
						nativeColor='green'
						className={classes.uploadInfo_icon} />
					<Button
						variant="contained"
						color="primary"
						onClick={this.onStartOver}
						className={classes.uploadInfo_button}
					>Start Over</Button>
				</div>
			</div>
		);
	}

	public renderUploadInfo_progress(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const upload_state = state.upload_state;
		const upload_index = state.upload_index;

		let file_state: UploadState_File|null = null;
		if (upload_state && upload_state.files.length > upload_index) {
			file_state = upload_state.files[upload_index];
		}

		const step_count = (state.file_list.length * 2) + 1;
		let step_index = 1 + (state.upload_index * 2);
		if (file_state && file_state.has_uploaded_rcrd) {
			step_index++;
		}

		const info_step = (
			<Typography
				align="center"
				variant="subheading"
				className={classes.uploadInfo_text}
			>
				{`Step ${step_index} of ${step_count}`}
			</Typography>
		);

		let is_uploading_rcrd = false;
		let is_uploading_data = false;
		let is_uploading_msg = false;

		if (state.upload_index >= state.file_list.length) {
			is_uploading_msg = true;
		}
		else
		{
			if (file_state && file_state.has_uploaded_rcrd) {
				is_uploading_data = true;
			}
			else {
				is_uploading_rcrd = true;
			}
		}

		let info_what: React.ReactNode;
		if (is_uploading_rcrd)
		{
			info_what = (
				<Typography
					align="center"
					variant="subheading"
					className={classes.uploadInfo_text}
				>
					Uploading encrypted metadata...
				</Typography>
			);
		}
		else if (is_uploading_data)
		{
			info_what = (
				<Typography
					align="center"
					variant="subheading"
					className={classes.uploadInfo_text}
				>
					Uploading encrypted file...
				</Typography>
			);
		}
		else
		{
			info_what = (
				<Typography
					align="center"
					variant="subheading"
					className={classes.uploadInfo_text}
				>
					Uploading encrypted message...
				</Typography>
			);
		}

		let info_file: React.ReactNode;
		if (is_uploading_data)
		{
			let percent = "0";
			if (file_state)
			{
				const file = this.state.file_list[upload_index];
				const progress = this.getProgress({file, file_state});

				percent = Math.floor(progress * 100).toString();
			}
			percent = _.padStart(percent, 3, '\u00A0');

			info_file = (
				<Typography
					align="center"
					variant="subheading"
					className={classes.uploadInfo_text_separate}
				>
					File progress:<span className={classes.monospaced}>{percent}</span><span className={classes.gray}>%</span>
				</Typography>
			);
		}
		else
		{
			info_file = (
				<Typography
					align="center"
					variant="subheading"
					className={classes.uploadInfo_text_separate}
				>&nbsp;
				</Typography>
			);
		}

		let info_multipart: React.ReactNode|null = null;
		if (file_state && file_state.multipart_state)
		{
			const multipart_state = file_state.multipart_state;

			if (multipart_state.upload_id == null)
			{
				info_multipart = (
					<Typography
						align="center"
						variant="subheading"
						className={classes.uploadInfo_text}
					>
						Initializing multipart upload...
					</Typography>
				);
			}
			else
			{
				const parts_flight: number[] = [];
				const parts_complete: number[] = [];

				for (let i = 0; i < multipart_state.num_parts; i++)
				{
					if (multipart_state.eTags[i] != null) {
						parts_complete.push(i);
					}
					else if (multipart_state.progress[i] != null) {
						parts_flight.push(i);
					}
				}

				if (parts_flight.length == 0)
				{
					if (parts_complete.length == multipart_state.num_parts)
					{
						info_multipart = (
							<Typography
								align="center"
								variant="subheading"
								className={classes.uploadInfo_text}
							>
								{`Completing multipart upload...`}
							</Typography>
						);
					}
					else
					{
						info_multipart = (
							<Typography
								align="center"
								variant="subheading"
								className={classes.uploadInfo_text}
							>&nbsp;</Typography>
						);
					}
				}
				else if (parts_flight.length == 1)
				{
					info_multipart = (
						<Typography
							align="center"
							variant="subheading"
							className={classes.uploadInfo_text}
						>
							{`Uploading part ${parts_flight[0]+1} of ${multipart_state.num_parts}...`}
						</Typography>
					);
				}
				else
				{
					info_multipart = (
						<Typography
							align="center"
							variant="subheading"
							className={classes.uploadInfo_text}
						>
							{`Uploading parts ${parts_flight[0]+1} & ${parts_flight[1]+1} of ${multipart_state.num_parts}...`}
						</Typography>
					);
				}
			}
		}

		return (
			<div className={classes.section_uploadInfo}>
				<div className={classes.uploadInfo_description_container}>
					{info_step}
					{info_what}
					{info_file}
					{info_multipart}
				</div>
			</div>
		);
	}

	public renderUploadInfo(): React.ReactNode {
		const {state} = this;

		if (state.upload_err_fatal) {
			return this.renderUploadInfo_err_fatal();
		}
		else if (state.upload_err_retry) {
			return this.renderUploadInfo_err_retry();
		}
		else if (state.upload_success) {
			return this.renderUploadInfo_success();
		}
		else {
			return this.renderUploadInfo_progress();
		}
	}

	public renderFileRow(file: ImageFile, idx: number): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const file_is_uploaded = (state.upload_index > idx);
		const file_is_uploading = state.is_uploading && (state.upload_index == idx);

		if (file_is_uploaded)
		{
			return (
				<TableRow key={`${idx}`} className={classes.tableRow}>
					<TableCell padding="none">
						<div className={classes.tableCell_div_container_fileName}>
							<Typography className={classes.fileNameWithoutProgress}>
								{file.name}
							</Typography>
						</div>
					</TableCell>
					<TableCell padding="none" className={classes.tableCell_right}>
						<div className={classes.tableCell_div_container_buttons}>
							<Typography className={classes.fileSizeText}>
								{filesize(file.size)}
							</Typography>
							<CheckCircleIcon
								className={classes.tableCell_iconRight}
								nativeColor='green' />
						</div>
					</TableCell>
				</TableRow>
			);	
		}
		else if (file_is_uploading)
		{
			const upload_failed = (state.upload_err_retry || state.upload_err_fatal);

			// We're going to display the progress, even if the upload has failed.
			// In the case of multipart, this makes sense as the upload is resumable.
			// 
			let progress = 0;
			const file_state = state.upload_state!.files[idx];
			if (file_state) {
				progress = this.getProgress({file, file_state}) * 100;
			}

			let section_status: React.ReactNode;
			if (upload_failed) {
				section_status = (
					<HighlightOffIcon
						className={classes.tableCell_iconRight}
						color="secondary"
					/>
				);
			}
			else {
				section_status = (
					<CircularProgress
						className={classes.tableCell_circularProgress}
						color="secondary"
						size={16}
					/>
				);
			}

			return (
				<TableRow key={`${idx}`} className={classes.tableRow}>
					<TableCell padding="none">
						<div className={classes.tableCell_div_container_fileName}>
							<Typography className={classes.fileNameWithProgress}>
								{file.name}
							</Typography>
							<LinearProgress
								className={classes.tableCell_linearProgress}
								variant="determinate"
								value={progress}
							/>
						</div>
					</TableCell>
					<TableCell padding="none" className={classes.tableCell_right}>
						<div className={classes.tableCell_div_container_buttons}>
							<Typography className={classes.fileSizeText}>
								{filesize(file.size)}
							</Typography>
							{section_status}
						</div>
					</TableCell>
				</TableRow>
			);
		}
		else
		{
			const onClick = this.deleteFile.bind(this, idx);

			return (
				<TableRow key={`${idx}`} className={classes.tableRow}>
					<TableCell padding="none">
						<div className={classes.tableCell_div_container_fileName}>
							<Typography className={classes.fileNameWithoutProgress}>
								{file.name}
							</Typography>
						</div>
					</TableCell>
					<TableCell padding="none" className={classes.tableCell_right}>
						<div className={classes.tableCell_div_container_buttons}>
							<Typography className={classes.fileSizeText}>
								{filesize(file.size)}
							</Typography>
							<Tooltip title="Remove file from list">
								<IconButton onClick={onClick} className={classes.tableCell_buttonRight}>
									<DeleteIcon className={classes.tableCell_buttonRight_icon}/>
								</IconButton>
							</Tooltip>
						</div>
					</TableCell>
				</TableRow>
			);
		}
	}

	public renderFileList(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const file_list = state.file_list;

		// It actually looks better with the rendered empty table.
		// I prefer the extra whitespace below the dropzone.
		// 
	//	if (file_list.length == 0) {
	//		return (
	//			<div/>
	//		);
	//	}

		return (
			<div className={classes.section_fileList}>
				<Table className={classes.table}>
					<TableBody>
						{file_list.map((file, idx)=> {
							return this.renderFileRow(file, idx);
						})}
					</TableBody>
				</Table>
			</div>
		);
	}

	public renderComment(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const is_disabled =
			state.pubkey_tampering_detected ||
			state.is_uploading;

		const chars_remaining = COMMENT_MAX_LENGTH - state.commentTextFieldStr.length;
		let chars_remaining_str: string;
		if (chars_remaining < 0) {
			chars_remaining_str = `Comment will be truncated! ${chars_remaining} characters left`;
		}
		else if (chars_remaining == 1) {
			chars_remaining_str = `${chars_remaining} character left`;
		}
		else {
			chars_remaining_str = `${chars_remaining} characters left`;
		}

		return (
			<div className={classes.section_comment}>
				<TextField
					id="comment"
					label="optional comment (will also be encrypted)"
					margin="normal"
					multiline={true}
					disabled={is_disabled}
					onChange={this.commentTextFieldChanged}
					className={classes.comment}
					inputProps={{
						maxLength: COMMENT_MAX_LENGTH,
					}}
				/>
				<Typography align="right" variant="caption">{chars_remaining_str}</Typography>
			</div>
		);
	}

	public renderSendButton(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const is_disabled =
			state.pubkey_tampering_detected ||
			state.file_list.length == 0     ||
			state.is_uploading;

		return (
			<div className={classes.section_sendButton}>
				<Button
					variant="contained"
					color="primary"
					disabled={is_disabled}
					onClick={this.onSend}
				>Send Securely</Button>
			</div>
		);
	}
	
	public render(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const section_userProfile = this.renderUserProfile();

		if (state.user_profile == null)
		{
			return (
				<div className={classes.root}>
					{section_userProfile}
				</div>
			);
		}
		else
		{
			const section_expansionPanel1 = this.renderExpansionPanel1();
			const section_expansionPanel2 = this.renderExpansionPanel2();
			const section_expansionPanel3 = this.renderExpansionPanel3();
			const section_selectionOrInfo = state.is_uploading
														 ? this.renderUploadInfo()
			                                  : this.renderFileSelection();
			const section_fileList        = this.renderFileList();
			const section_comment         = this.renderComment();
			const section_button          = this.renderSendButton();

			return (
				<div className={classes.root}>
					{section_userProfile}
					<div className={classes.section_expansionPanels}>
						{section_expansionPanel1}
						{section_expansionPanel2}
						{section_expansionPanel3}
					</div>
					{section_selectionOrInfo}
					{section_fileList}
					{section_comment}
					{section_button}
				</div>
			);
		}
	}

	public componentDidMount() {
		log.debug("componentDidMount()");

		this.bootstrap();
	}

	/**
	 * Kicks off the UI.
	 * Invoked by:
	 * - componentDidMount()
	 * - onStartOver();
	**/
	public bootstrap() {

		this.fetchUserProfile();
	}
}

export default withStyles(styles)(withRouter(Send));