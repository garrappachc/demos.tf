'use strict';

import React, {Component, PropTypes} from 'react';

import {Link} from 'react-router';
import ReactList from 'react-list';

import {DemoListProvider} from '../Providers/DemoProvider.js';
import {DemoRow} from '../components/DemoRow.js';
import {Footer} from '../components/Footer.js';
import {FilterBar} from '../components/FilterBar.js';
import Select from 'react-select';
import {PlayerProvider} from '../Providers/PlayerProvider.js';
import Spinner from 'react-spinner';

require('./ListPage.css');
require('react-spinner/react-spinner.css');

export class ListPage extends Component {
	static contextTypes = {
		router: PropTypes.object
	};

	static page = 'list';

	state = {
		demos      : [],
		steamid    : '',
		isUploads  : false,
		loading    : true,
		subjectName: ''
	};

	loading = false;

	rowMap = [];

	constructor(props) {
		super(props);
		var params = props.params || {};
		this.playerProvider = new PlayerProvider();
		if (params.steamid) {
			this.state.steamid = params.steamid;
			this.state.isUploads = props.route.path.substr(0, 9) === '/uploads/';
			if (this.state.isUploads) {
				this.endpoint = 'uploads/' + params.steamid;
			} else {
				this.endpoint = 'profiles/' + params.steamid;
			}
		} else {
			this.state.isUploads = false;
			this.endpoint = 'demos';
		}
		this.provider = props.demoListProvider;
		this.provider.endPoint = this.endpoint;
	}

	componentWillReceiveProps(props) {
		var params = props.params || {};
		let isUploads = false, steamid = '';
		this.playerProvider = new PlayerProvider();
		if (params.steamid) {
			steamid = params.steamid;
			isUploads = props.route.path.substr(0, 9) === '/uploads/';
			if (isUploads) {
				this.endpoint = 'uploads/' + params.steamid;
			} else {
				this.endpoint = 'profiles/' + params.steamid;
			}
		} else {
			this.endpoint = 'demos';
		}
		this.provider.endPoint = this.endpoint;
		this.filterChange();
		this.setState({steamid, isUploads});
	}

	filterChange = () => {
		this.provider.reset();
		this.setState({demos: []});
		this.rowMap = [];
		this.loadPage();
	};

	loadPage = async() => {
		if (this.loading || !this.provider.more) {
			return;
		}
		this.loading = true;
		var demos = await this.provider.loadNextPage();
		if (this.state.demos.length === demos.length) {
			if (this.provider.more) {
				this.setState({demos: []});
				this.rowMap = [];
			} else {
				this.loading = false;
				return;
			}
		}
		this.setState({demos});
		this.loading = false;
		if (demos.length < 40 && this.provider.more) {
			setTimeout(this.loadPage, 10);
		}
	};

	getSubjectName = async() => {
		if (this.state.steamid) {
			const subjectName = await this.playerProvider.getName(this.state.steamid);
			if (this.state.subjectName !== subjectName) {
				this.setState({subjectName});
			}
		} else if (this.state.subjectName !== '') {
			this.setState({subjectName: ''});
		}
	};

	componentDidMount = async() => {
		document.title = 'Demos - demos.tf';
		const demos = await this.provider.loadTillPage(1);
		await this.getSubjectName();
		this.setState({loading: false, demos});
	};

	renderItem = (i) => {
		if (i > this.state.demos.length - 5 && this.provider.more) {
			this.loadPage();
		}
		const demo = this.state.demos[i];
		if (this.rowMap[demo.id]) {
			return this.rowMap[demo.id];
		}
		this.rowMap[demo.id] = <DemoRow i={i} key={i} {...demo} />;
		return this.rowMap[demo.id];
	};

	renderItems = (items, ref) => {
		return (
			<table ref={ref} className="demolist">
				<thead className="head">
					<tr>
						<th className="title">Title</th>
						<th className="format">Format</th>
						<th className="map">Map</th>
						<th className="duration">Duration</th>
						<th className="date">Date</th>
					</tr>
				</thead>
				<tbody>
					{items}
				</tbody>
			</table>
		)
	};

	render() {
		this.getSubjectName();
		var demoTitle = 'Demos';

		if (this.state.steamid) {
			var options = [
				{value: 'uploads', 'label': 'Uploads'},
				{value: 'demos', 'label': 'Demos'}
			];
			var setListType = (type) => {
				var isUploads = type.value == 'uploads';
				if (isUploads !== this.state.isUploads) {
					if (isUploads) {
						this.endpoint = 'uploads/' + this.state.steamid;
					} else {
						this.endpoint = 'profiles/' + this.state.steamid;
					}
					this.provider.endPoint = this.endpoint;
					this.filterChange();
					this.setState({isUploads, demos: []});
					this.context.router.push('/' + (isUploads ? 'uploads' : 'profiles') + '/' + this.state.steamid);
				}
			};
			demoTitle = (
				<span className="listType">
					<Select options={options}
							clearable={false}
							value={this.state.isUploads ? 'uploads' : 'demos'}
							onChange={setListType}
							searchable={false}
					/> {this.state.isUploads ? 'by' : 'for'} {this.state.subjectName}
				</span>
			);
		}

		return (
			<div>
				<h1>{demoTitle}</h1>

				<div className="search">
					<FilterBar provider={this.provider}
							   filter={this.provider.filter}
							   onChange={this.filterChange} />
				</div>

				{!this.state.loading ?
					(<ReactList
						type="uniform"
						itemRenderer={this.renderItem}
						itemsRenderer={this.renderItems}
						length={this.state.demos.length}
					/>) : (<Spinner />)}
				<Footer />
			</div>
		);
	}
}

