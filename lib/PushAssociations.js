var mongoose = require( 'mongoose' );
var config = require( './Config' );
var _ = require( 'lodash' );

// Init
var PushAssociation;

var initialize = _.once( () => {
    var db = mongoose.connect( config.get( 'mongodbUrl' ) );
    mongoose.connection.on( 'error', errorHandler );

    let pushAssociationSchema = new db.Schema( {
        user: {
            type: 'String',
            required: true
        },
        type: {
            type: 'String',
            required: true,
            enum: [ 'ios', 'android' ],
            lowercase: true
        },
        token: {
            type: 'String',
            required: true
        },
        sub: {
            type: 'String',
            required: false
        }
    } );

    // I must ensure uniqueness accross the two properties because two users can have the same token (ex: in apn, 1 token === 1 device)
    pushAssociationSchema.index( { user: 1, token: 1 }, { unique: true } );

    PushAssociation = db.model( 'PushAssociation', pushAssociationSchema );

    return module.exports;
} );

var add = function( user, deviceType, token, sub ) {
    var pushItem = new PushAssociation( { user: user, type: deviceType, token: token, sub: sub } );
    pushItem.save();
};

var update = ( user, deviceType, token, sub ) => {
    var query = { user: user };
    var newData = {
        user: user,
        type: deviceType,
        token: token,
        sub: sub || ''
    };

    PushAssociation.findOneAndUpdate( query, newData, { upsert: true }, function( err ) {
        if ( err ) {
            console.error( err );
        }
    } );
};

var updateTokens = function( fromToArray ) {
    fromToArray.forEach( function( tokenUpdate ) {
        PushAssociation.findOneAndUpdate( { token: tokenUpdate.from }, { token: tokenUpdate.to }, function( err ) {
            if ( err ) {
                console.error( err );
            }
        } );
    } );
};

var getAll = function( callback ) {
    var wrappedCallback = outputFilterWrapper( callback );

    PushAssociation.find( wrappedCallback );
};

var getForUser = function( user, callback ) {
    var wrappedCallback = outputFilterWrapper( callback );

    PushAssociation.find( { user: user }, wrappedCallback );
};

var getForUsers = function( users, callback ) {
    var wrappedCallback = outputFilterWrapper( callback );

    PushAssociation.where( 'user' )
        .in( users )
        .exec( wrappedCallback );
};

var getForSub = function( sub, callback ) {
    var wrappedCallback = outputFilterWrapper( callback );

    PushAssociation.find( { sub: sub }, wrappedCallback );
};

var getForSubs = function( subs, callback ) {
    var wrappedCallback = outputFilterWrapper( callback );

    PushAssociation.where( 'sub' )
        .in( subs )
        .exec( wrappedCallback );
};

var removeForUser = function( user ) {

    PushAssociation.remove( { user: user }, function( err ) {
        if ( err ) {
            console.dir( err );
        }
    } );
};

var removeDevice = function( token ) {
    PushAssociation.remove( { token: token }, function( err ) {
        if ( err ) {
            console.log( err );
        }
    } );
};

var removeDevices = function( tokens ) {
    PushAssociation.remove( { token: { $in: tokens } }, function( err ) {
        if ( err ) {
            console.log( err );
        }
    } );
};

var outputFilterWrapper = function( callback ) {
    return function( err, pushItems ) {
        if ( err ) {
            return callback( err, null );
        }

        let items = _.map( pushItems, function( pushItem ) {
            return _.pick( pushItem, [ 'user', 'type', 'token', 'sub' ] );
        } );

        return callback( null, items );
    };
};

var initWrapper = function( object ) {
    return _.transform( object, function( newObject, func, funcName ) {
        if ( !_.isFunction( func ) ) {
            return newObject[ funcName ] = func;
        }

        newObject[ funcName ] = function() {
            if ( _.isUndefined( PushAssociation ) ) {
                initialize();
            }

            return func.apply( null, arguments );
        };
    } );
};

var errorHandler = function( error ) {
    console.error( 'ERROR: ' + error );
};

module.exports = initWrapper( {
    add: add,
    update: update,
    updateTokens: updateTokens,
    getAll: getAll,
    getForUser: getForUser,
    getForUsers: getForUsers,
    getForSub: getForSub,
    getForSubs: getForSubs,
    removeForUser: removeForUser,
    removeDevice: removeDevice,
    removeDevices: removeDevices
} );
