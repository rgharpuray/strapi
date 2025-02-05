/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import {
  endsWith,
  find,
  findIndex,
  findKey,
  forEach,
  get,
  isEmpty,
  includes,
  join,
  map,
  replace,
  size,
  toNumber,
} from 'lodash';
import { FormattedMessage } from 'react-intl';
import Helmet from 'react-helmet';

import { InputSelect } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
// design
import ContentHeader from '../../components/ContentHeader';
import EditForm from '../../components/EditForm';
import HeaderNav from '../../components/HeaderNav';
import List from '../../components/List';
import RowDatabase from '../../components/RowDatabase';
import RowLanguage from '../../components/RowLanguage';
import PluginLeftMenu from '../../components/PluginLeftMenu';

import {
  checkFormValidity,
  getRequiredInputsDb,
} from '../../utils/inputValidations';
import { formatLanguageLocale } from '../../utils/getFlag';
import sendUpdatedParams from '../../utils/sendUpdatedParams';
// App selectors
import { makeSelectSections, makeSelectEnvironments } from '../App/selectors';
import selectHomePage from './selectors';
import {
  cancelChanges,
  changeDefaultLanguage,
  changeInput,
  closeModal,
  configFetch,
  databaseEdit,
  databasesFetch,
  databaseDelete,
  editSettings,
  emptyDbModifiedData,
  languageDelete,
  languagesFetch,
  newLanguagePost,
  newDatabasePost,
  setErrors,
  specificDatabaseFetch,
} from './actions';
import reducer from './reducer';
import saga from './sagas';

import styles from './styles.scss';
import config from './config.json';

/* eslint-disable react/require-default-props  */
export class HomePage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.customComponents = config.customComponents;
    this.components = {
      // editForm: EditForm,
      defaultComponent: EditForm,
      list: List,
      defaultComponentWithEnvironments: HeaderNav,
    };

    // allowing state only for database modal purpose
    this.state = {
      modal: false,
      toggleDefaultConnection: false,
    };

    this.sendUpdatedParams = sendUpdatedParams.bind(this);
  }

  componentDidMount() {
    if (this.props.match.params.slug) {
      this.handleFetch(this.props);
    } else {
      this.props.history.push(
        `/plugins/settings-manager/${get(this.props.menuSections, [
          '0',
          'items',
          '0',
          'slug',
        ]) || 'application'}`,
      );
    }
  }

  componentWillReceiveProps(nextProps) {
    // check if params slug updated
    if (
      this.props.match.params.slug !== nextProps.match.params.slug &&
      nextProps.match.params.slug
    ) {
      if (nextProps.match.params.slug) {
        // get data from api if params slug updated
        this.handleFetch(nextProps);
      } else {
        // redirect user if no params slug provided
        this.props.history.push(
          `/plugins/settings-manager/${get(this.props.menuSections, [
            '0',
            'items',
            '0',
            'slug',
          ])}`,
        );
      }
    } else if (
      this.props.match.params.env !== nextProps.match.params.env &&
      nextProps.match.params.env &&
      this.props.match.params.env
    ) {
      // get data if params env updated
      this.handleFetch(nextProps);
    }
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.home.didCreatedNewLanguage !==
      this.props.home.didCreatedNewLanguage
    ) {
      this.handleFetch(this.props);
    }

    if (prevProps.home.didCreatedNewDb !== this.props.home.didCreatedNewDb) {
      this.handleFetch(this.props);
    }
  }

  /* eslint-disable react/sort-comp */
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  addConnection = e => {
    e.preventDefault();
    const newData = {};
    /* eslint-disable no-template-curly-in-string */
    const dbName = get(
      this.props.home.modifiedData,
      'database.connections.${name}.name',
    );
    map(this.props.home.modifiedData, (data, key) => {
      const k = replace(key, '${name}', dbName);

      if (key !== 'database.connections.${name}.name') {
        newData[k] = data;
      }
    });

    const formErrors = getRequiredInputsDb(
      this.props.home.modifiedData,
      this.props.home.formErrors,
    );

    if (isEmpty(formErrors)) {
      // this.props.setErrors([]);
      this.props.newDatabasePost(
        this.props.match.params.env,
        newData,
        this.context,
      );
    } else {
      this.props.setErrors(formErrors);
    }
  };

  emptyDbModifiedData = () => {
    this.setState({ toggleDefaultConnection: false });
    this.props.emptyDbModifiedData();
  };

  getDatabase = databaseName => {
    // allow state here just for modal purpose
    this.props.specificDatabaseFetch(databaseName, this.props.match.params.env);
    // this.setState({ modal: !this.state.modal });
  };

  handleDefaultLanguageChange = ({ target }) => {
    // create new object configsDisplay based on store property configsDisplay
    const configsDisplay = {
      name: this.props.home.configsDisplay.name,
      description: this.props.home.configsDisplay.description,
      sections: [],
    };

    // Find the index of the new setted language
    const activeLanguageIndex = findIndex(
      this.props.home.configsDisplay.sections,
      ['name', target.id],
    );

    forEach(this.props.home.configsDisplay.sections, (section, key) => {
      // set all Language active state to false
      if (key !== activeLanguageIndex) {
        configsDisplay.sections.push({ name: section.name, active: false });
      } else {
        // set the new language active state to true
        configsDisplay.sections.push({ name: section.name, active: true });
      }
    });

    // reset all the configs to ensure component is updated
    this.props.changeDefaultLanguage(configsDisplay, target.id);

    // format the default locale
    const defaultLanguageArray = formatLanguageLocale(target.id);

    // Edit the new config
    this.props.editSettings(
      { 'language.defaultLocale': join(defaultLanguageArray, '_') },
      'i18n',
      this.context,
    );
  };

  handleFetch(props) {
    const apiUrl = props.match.params.env
      ? `${props.match.params.slug}/${props.match.params.env}`
      : props.match.params.slug;

    switch (props.match.params.slug) {
      case 'languages':
        return this.props.languagesFetch();
      case 'databases':
        return this.props.databasesFetch(props.match.params.env);
      default:
        return this.props.configFetch(apiUrl);
    }
  }

  handleChange = ({ target }) => {
    let value =
      target.type === 'number' && target.value !== ''
        ? toNumber(target.value)
        : target.value;
    let name = target.name;

    if (this.props.match.params.slug === 'security') {
      // the only case where the input doesn't have a name
      if (target.name === '') {
        name = 'security.xframe.value.nested';
        value = target.value;
      }
    }

    if (this.props.match.params.slug === 'databases') {
      if (name === this.props.home.dbNameTarget) {
        const formErrors =
          value ===
          this.props.home.addDatabaseSection.sections[1].items[0].value
            ? [
              {
                target: name,
                errors: [
                  { id: 'settings-manager.request.error.database.exist' },
                ],
              },
            ]
            : [];
        this.props.setErrors(formErrors);
      } else if (endsWith(name, '.settings.client')) {
        const item = find(
          this.props.home.addDatabaseSection.sections[0].items[1].items,
          { value },
        );
        this.props.changeInput(
          'database.connections.${name}.settings.port',
          item.port,
        );
        this.props.changeInput(
          `database.connections.${
            this.props.home.addDatabaseSection.sections[1].items[0].value
          }.settings.port`,
          item.port,
        );
      } else {
        this.props.setErrors([]);
      }
    }
    this.props.changeInput(name, value);
  };

  handleChangeLanguage = ({ target: { value } }) => {
    this.props.changeInput('language.defaultLocale', value);
  };

  handleCancel = () => this.props.cancelChanges();

  handleSetDefaultConnectionDb = () => {
    const value = this.state.toggleDefaultConnection
      ? this.props.home.addDatabaseSection.sections[1].items[0].value
      : this.props.home.modifiedData[this.props.home.dbNameTarget];
    const target = { name: 'database.defaultConnection', value };
    this.handleChange({ target });
    this.setState({
      toggleDefaultConnection: !this.state.toggleDefaultConnection,
    });
  };

  handleSubmit = e => {
    // eslint-disable-line consistent-return
    e.preventDefault();
    const apiUrl = this.props.match.params.env
      ? `${this.props.match.params.slug}/${this.props.match.params.env}`
      : this.props.match.params.slug;

    const isCreatingNewFields = this.props.match.params.slug === 'security';
    // send only updated settings
    const body = this.sendUpdatedParams(isCreatingNewFields);
    const formErrors = checkFormValidity(body, this.props.home.formValidations);

    if (isEmpty(body))
      return strapi.notification.info(
        'settings-manager.strapi.notification.info.settingsEqual',
      );
    if (isEmpty(formErrors)) {
      this.props.editSettings(body, apiUrl, this.context);
    } else {
      this.props.setErrors(formErrors);
    }
  };

  handleSubmitEditDatabase = databaseName => {
    // eslint-disable-line consistent-return
    const body = this.sendUpdatedParams();
    const apiUrl = `${databaseName}/${this.props.match.params.env}`;
    const formErrors = checkFormValidity(
      body,
      this.props.home.formValidations,
      this.props.home.formErrors,
    );

    if (isEmpty(body)) {
      this.props.closeModal();
      return strapi.notification.info(
        'settings-manager.strapi.notification.info.settingsEqual',
      );
    }

    if (isEmpty(formErrors)) {
      this.props.databaseEdit(body, apiUrl, this.context);
    } else {
      this.props.setErrors(formErrors);
    }
  };

  // retrieve the language to delete using the target id
  handleLanguageDelete = languaToDelete =>
    this.props.languageDelete(languaToDelete);

  handleDatabaseDelete = dbName => {
    this.context.enableGlobalOverlayBlocker();
    strapi.notification.success(
      'settings-manager.strapi.notification.success.databaseDelete',
    );
    this.props.databaseDelete(
      dbName,
      this.props.match.params.env,
      this.context,
    );
  };

  // custom Row rendering for the component List with params slug === languages
  renderRowLanguage = (props, key, liStyles) => (
    <RowLanguage
      key={key}
      {...props}
      liStyles={liStyles}
      onDeleteLanguage={this.handleLanguageDelete}
      listLanguages={this.props.home.listLanguages}
      onDefaultLanguageChange={this.handleDefaultLanguageChange}
    />
  );

  renderListTitle = () => {
    const availableContentNumber = size(
      this.props.home.configsDisplay.sections,
    );
    const title =
      availableContentNumber > 1
        ? `list.${this.props.match.params.slug}.title.plural`
        : `list.${this.props.match.params.slug}.title.singular`;
    const titleDisplay = title ? (
      <FormattedMessage id={`settings-manager.${title}`} />
    ) : (
      ''
    );

    return (
      <span>
        {availableContentNumber}&nbsp;{titleDisplay}
      </span>
    );
  };

  renderListButtonLabel = () =>
    `list.${this.props.match.params.slug}.button.label`;

  renderPopUpFormDatabase = (section, props, popUpStyles) =>
    map(section.items, (item, key) => {
      const isActive =
        props.values[this.props.home.dbNameTarget] ===
        this.props.home.modifiedData['database.defaultConnection'] ? (
            <div className={popUpStyles.stmrounded}>
              <i className="fa fa-check" />
            </div>
          ) : (
            ''
          );

      if (item.name === 'form.database.item.default') {
        return (
          <div
            key={key}
            className={popUpStyles.stmdefaultConnection}
            id={item.target}
            onClick={this.handleSetDefaultConnectionDb}
          >
            <FormattedMessage id={`settings-manager.${item.name}`} />
            {isActive}
          </div>
        );
      }
      return props.renderInput(item, key);
    });

  renderPopUpFormLanguage = section =>
    map(section.items, item => {
      const value =
        this.props.home.modifiedData[item.target] ||
        this.props.home.selectOptions.options[0].value;

      return (
        <div className={'col-md-6'} key={item.name}>
          <div className={styles.stmmodalLanguageLabel}>
            <FormattedMessage id={`settings-manager.${item.name}`} />
          </div>
          <InputSelect
            name={item.target}
            value={value}
            selectOptions={this.props.home.selectOptions.options}
            onChange={this.handleChangeLanguage}
            validations={{}}
          />
          <div className={styles.stmpopUpSpacer} />
        </div>
      );
    });

  renderRowDatabase = (props, key) => (
    <RowDatabase
      key={key}
      data={props}
      getDatabase={this.getDatabase}
      onDeleteDatabase={this.handleDatabaseDelete}
      sections={this.props.home.specificDatabase.sections}
      values={this.props.home.modifiedData}
      onChange={this.handleChange}
      renderPopUpForm={this.renderPopUpFormDatabase}
      onSubmit={this.handleSubmitEditDatabase}
      formErrors={this.props.home.formErrors}
      error={this.props.home.error}
      resetToggleDefaultConnection={this.resetToggleDefaultConnection}
    />
  );

  renderComponent = () => {
    // check if  settingName (params.slug) has a custom view display
    let specificComponent = findKey(this.customComponents, value =>
      includes(value, this.props.match.params.slug),
    );

    if (!specificComponent) {
      // Check if params env : render HeaderNav component
      specificComponent = !this.props.match.params.env
        ? 'defaultComponent'
        : 'defaultComponentWithEnvironments';
    }

    // if custom view display render specificComponent
    const Component = this.components[specificComponent];
    const addRequiredInputDesign = this.props.match.params.slug === 'databases';
    const listTitle = ['languages', 'databases'].includes(
      this.props.match.params.slug,
    )
      ? this.renderListTitle()
      : '';
    const listButtonLabel = ['languages', 'databases'].includes(
      this.props.match.params.slug,
    )
      ? this.renderListButtonLabel()
      : '';

    // check if HeaderNav component needs to render a form or a list
    const renderListComponent = this.props.match.params.slug === 'databases';

    let handleListPopUpSubmit;
    // sections is the props used by EditForm in case of list of table rendering we need to change its value
    let sections;
    let renderPopUpForm = false;
    let renderRow = false;
    let actionBeforeOpenPopUp;
    let addListTitleMarginTop;

    switch (this.props.match.params.slug) {
      case 'languages':
        sections = this.props.home.listLanguages.sections;

        // custom rendering for PopUpForm
        renderPopUpForm = this.renderPopUpFormLanguage;
        renderRow = this.renderRowLanguage;
        handleListPopUpSubmit = this.props.newLanguagePost;
        break;
      case 'databases':
        sections = this.props.home.addDatabaseSection.sections;
        renderPopUpForm = this.renderPopUpFormDatabase;
        handleListPopUpSubmit = this.addConnection;
        renderRow = this.renderRowDatabase;
        actionBeforeOpenPopUp = this.emptyDbModifiedData;
        addListTitleMarginTop = true;
        break;
      default:
        sections = this.props.home.configsDisplay.sections;
    }

    // Custom selectOptions for languages
    const selectOptions =
      this.props.match.params.slug === 'languages'
        ? this.props.home.listLanguages
        : [];
    return (
      <Component
        sections={sections}
        listItems={this.props.home.configsDisplay.sections}
        values={this.props.home.modifiedData}
        onChange={this.handleChange}
        onCancel={this.handleCancel}
        onSubmit={this.handleSubmit}
        links={this.props.environments}
        path={this.props.location.pathname}
        slug={this.props.match.params.slug}
        renderRow={renderRow}
        listTitle={listTitle}
        listButtonLabel={listButtonLabel}
        handlei18n
        handleListPopUpSubmit={handleListPopUpSubmit}
        selectOptions={selectOptions}
        renderPopUpForm={renderPopUpForm}
        renderListComponent={renderListComponent}
        cancelAction={this.props.home.cancelAction}
        actionBeforeOpenPopUp={actionBeforeOpenPopUp}
        addRequiredInputDesign={addRequiredInputDesign}
        addListTitleMarginTop={addListTitleMarginTop}
        formErrors={this.props.home.formErrors}
        error={this.props.home.error}
        showLoader={this.props.home.showLoader}
      />
    );
  };

  // Set the toggleDefaultConnection to false
  resetToggleDefaultConnection = () =>
    this.setState({ toggleDefaultConnection: false });

  // Hide database modal
  toggle = () => this.setState({ modal: !this.state.modal });

  render() {
    return (
      <div className="container-fluid">
        <div className="row">
          <PluginLeftMenu
            sections={this.props.menuSections}
            environments={this.props.environments}
            envParams={this.props.match.params.env}
          />
          <div className={`${styles.stmhome} col-md-9`}>
            <Helmet
              title="Settings Manager"
              meta={[
                {
                  name: 'Settings Manager Plugin',
                  content: 'Modify your app settings',
                },
              ]}
            />
            <ContentHeader
              name={this.props.home.configsDisplay.name}
              description={this.props.home.configsDisplay.description}
            />

            {this.renderComponent()}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  environments: makeSelectEnvironments(),
  home: selectHomePage(),
  menuSections: makeSelectSections(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      cancelChanges,
      changeDefaultLanguage,
      changeInput,
      configFetch,
      closeModal,
      databaseDelete,
      databaseEdit,
      databasesFetch,
      editSettings,
      emptyDbModifiedData,
      languageDelete,
      languagesFetch,
      newDatabasePost,
      newLanguagePost,
      setErrors,
      specificDatabaseFetch,
    },
    dispatch,
  );
}

HomePage.contextTypes = {
  emitEvent: PropTypes.func,
};

HomePage.propTypes = {
  cancelChanges: PropTypes.func.isRequired,
  changeDefaultLanguage: PropTypes.func.isRequired,
  changeInput: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  configFetch: PropTypes.func.isRequired,
  databaseDelete: PropTypes.func.isRequired,
  databaseEdit: PropTypes.func.isRequired,
  databasesFetch: PropTypes.func.isRequired,
  editSettings: PropTypes.func.isRequired,
  emptyDbModifiedData: PropTypes.func.isRequired,
  environments: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  home: PropTypes.object.isRequired,
  languageDelete: PropTypes.func.isRequired,
  languagesFetch: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  menuSections: PropTypes.array.isRequired,
  newDatabasePost: PropTypes.func.isRequired,
  newLanguagePost: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  specificDatabaseFetch: PropTypes.func.isRequired,
};

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);

const withReducer = strapi.injectReducer({
  key: 'homePage',
  reducer,
  pluginId,
});
const withSaga = strapi.injectSaga({ key: 'homePage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(HomePage);
