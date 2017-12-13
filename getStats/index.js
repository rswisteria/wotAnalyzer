'use strict';

const request = require('request');
const dotenv = require('dotenv');

exports.handler = (event, context, callback) => {
    dotenv.config();
    console.log(process.env);
    let applicationId = process.env.WOT_APPLICATION_ID;
    let region = event.region;

    if (event.username == null) {
        callback('username is needed.');
        return;
    }
    if (event.region == null) {
        region = 'asia';
    }

    getAccountIdByUsername(applicationId, event.username, 'asia').then((accountId) => {
        let personalDataPromise = getPersonalData(applicationId, accountId, region);
        let vehicleDataPromise = getVehicleStatistics(applicationId, accountId, region);
        return Promise.all([personalDataPromise, vehicleDataPromise]);
    }).then((result) => {
        console.log(result);
        callback();
    }).catch((error) => {
        callback(error);
    });
};

const getAccountIdByUsername = (applicationId, username, region) => {
    let options = {
        method: 'GET',
        region: region,
        api: '/account/list/',
        params: { search: username, language: 'en', limit: 1 }
    };
    return requestApi(applicationId, options).then((result) => {
        if (result.meta.count == 0) {
            throw new Error({ code: '404', message: 'username not found'});
        } else {
            return result.data[0].account_id;
        }
    });
};

const getVehicleStatistics = (applicationId, accountId, region) => {
    let options = {
        method: 'GET',
        region: region,
        api: '/tanks/stats/',
        params: { account_id: accountId, language: 'en', fields: 'all' }
    };
    return requestApi(applicationId, options).then((result) => {
        if (result.meta.count == 0) {
            throw new Error({ code: '404', message: 'account_id is not found'});
        } else {
            return result.data;
        }
    });
};

const getPersonalData = (applicationId, accountId, region) => {
    let options = {
        method: 'GET',
        region: region,
        api: '/account/info/',
        params: { account_id: accountId, language: 'en' }
    };
    return requestApi(applicationId, options).then((result) => {
        return result.data;
    });
};

const requestApi = (applicationId, options) => {
    let method = options.method;
    let region = options.region;
    let api = options.api;
    let params = options.params;
    let promise = new Promise((resolve, reject) => {
        let options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            url: 'https://api.worldoftanks.' + region + '/wot' + api,
            form: Object.assign({}, params, { application_id: applicationId }),
            json: true
        };
        request(options, (error, response, body) => {
            if (body.status == 'error') {
                reject(body.error);
            } else {
                resolve(body);
            }
        });
    });
    return promise;
};
