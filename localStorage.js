/**
 * Enhanced localStorage to compatible with IE 6 / 6+ / FireFox / Chrome / Opera / Safri
 * jQuery 1.5+ / json2.js required.
 * 
 * @author knight
 * @version 1.0 
 */

/**
 * Determine whether we're using localStorage or, 
 * if the user's web broswer doesn't support localStorage.
 * Instead a mock object based on userData will be inited.
 */
;(function($, window, document){

	// mock object prepared to instead of localStorage
	var Ejyals;
	// ["localStorage" in window] here towards avoiding permission error
	if("localStorage" in window){
		try{
			Ejyals = window.localStorage;
			return;
		}catch(e){
			console.log('Call localStorage Error:'+e);
		}
	}

	// when localStorage is useless,userData applies
	var headObj = $("head")[0];
	// if user's web broswer doesn't support userData but to abandon localSotrage
	if(!headObj.addBehavior){
		try{
			Ejyals = window.localStorage;
		}catch(e){
			Ejyals = null;
		}
		return;
	}

	// init userData
	var hostKey = window.location.hostname || "localStorage";
	try{
		var date = new Date();
		date.setDate(date.getDate() + 365);//  Exp.date but we clear cache manually
		headObj.addBehavior("#default#userData");
		headObj.expires = date.toUTCString();
		headObj.load(hostKey);
		headObj.save(hostKey);
	}catch(e){
		return;
	}

	// special treatment for userData key
	var prefix = "p__hack_", spfix = "m-_-c",
		reg1 = new RegExp("^"+prefix),
		reg2 = new RegExp(spfix,"g"),
		encode = function(key){ return encodeURIComponent(prefix + key).replace(/%/g, spfix); },
		decode = function(key){ return decodeURIComponent(key.replace(reg2, "%")).replace(reg1,""); };

	var root, attrs;
	try{
		root = headObj.XMLDocument.documentElement;
		attrs = root.attributes;
	}catch(e){
		return;
	}

	// the mock object
	Ejyals = {
		getItem: function(cacheKey){
			return (attrs.getNamedItem( encode(cacheKey) ) || {nodeValue: null}).nodeValue||root.getAttribute(encode(cacheKey));
		},
		setItem: function(cacheKey, value){
			try{
				root.setAttribute( encode(cacheKey), value);
				headObj.save(hostKey);
			}catch(e){
			}
		},
		removeItem: function(cacheKey){
			try{
				root.removeAttribute( encode(cacheKey) );
				headObj.save(hostKey);
			}catch(e){
			}
		}
	};

	// the interface
	if(!("localStorage" in window)){
		window.localStorage = Ejyals;
	}

})(jQuery, window);

(function($, window, document){
    /**
     * Generate the cache key under which to store the local data - either the cache key supplied,
     * or one generated from the url, the type and, if present, the data.
     */
    var genCacheKey = function (options) {
        var url = options.url.replace(/jQuery.*/, '');

        // Strip _={timestamp}, if cache is set to false
        if (options.cache === false) {
            url = url.replace(/([?&])_=[^&]*/, '');
        }

        return options.cacheKey || url + options.type.toUpperCase() + (options.data || '');
    };
    /**
     * Determine whether we're using localStorage or, if the user has specified something other than a boolean
     * value for options.localCache, whether the value appears to satisfy the plugin's requirements.
     * Otherwise, throw a new TypeError indicating what type of value we expect.
     * @param {boolean|object} storage
     * @returns {boolean|object}
     */
    var getStorage = function(storage){
        if (!storage) return false;
        if (storage === true) return window.localStorage;
        if (typeof storage === "object" && 'getItem' in storage &&
            'removeItem' in storage && 'setItem' in storage)
        {
            return storage;
        }
        throw new TypeError("localCache must either be a boolean value, " +
            "or an object which implements the Storage interface.");
    };
    /**
     * Prefilter for caching ajax calls.
     * See also $.ajaxTransport for the elements that make this compatible with jQuery Deferred.
     * New parameters available on the ajax call:
     * localCache   : true // required - either a boolean (in which case localStorage is used), or an object
     * implementing the Storage interface, in which case that object is used instead.
     * cacheTTL     : 5,           // optional - cache time in hours, default is 5.
     * cacheKey     : 'post',      // optional - key under which cached string will be stored
     * isCacheValid : function  // optional - return true for valid, false for invalid
     * @method $.ajaxPrefilter
     * @param options {Object} Options for the ajax call, modified with ajax standard settings
     */
    $.ajaxPrefilter(function(options){
        var storage = getStorage(options.localCache),
            hourstl = options.cacheTTL || 5,
            cacheKey = genCacheKey(options),
            cacheValid = options.isCacheValid,
            ttl,
            value;

        if (!storage) return;
        ttl = storage.getItem(cacheKey + 'cachettl');

        if (cacheValid && typeof cacheValid === 'function' && !cacheValid()){
            storage.removeItem(cacheKey);
        }

        if (ttl && ttl < +new Date()){
            storage.removeItem(cacheKey);
            storage.removeItem(cacheKey + 'cachettl');
            ttl = 0;
        }

        value = storage.getItem(cacheKey);
        if (!value){
            // If it not in the cache, we store the data, add success callback - normal callback will proceed
            if (options.success) {
                options.realsuccess = options.success;
            }
            options.success = function(data) {
                var strdata = data;
                if (this.dataType.toLowerCase().indexOf('json') === 0) strdata = JSON.stringify(data);

                // Save the data to storage catching exceptions (possibly QUOTA_EXCEEDED_ERR)
                try {
                    storage.setItem(cacheKey, strdata);
                } catch (e) {
                    // Remove any incomplete data that may have been saved before the exception was caught
                    storage.removeItem(cacheKey);
                    storage.removeItem(cacheKey + 'cachettl');
                    console.log('Cache Error:'+e, cacheKey, strdata );
                }

                if (options.realsuccess) options.realsuccess(data);
            };

            // store timestamp
            if (!ttl){
                storage.setItem(cacheKey + 'cachettl', +new Date() + 1000 * 60 * 60 * hourstl);
            }
        }
    });

    /**
     * This function performs the fetch from cache portion of the functionality needed to cache ajax
     * calls and still fulfill the jqXHR Deferred Promise interface.
     * See also $.ajaxPrefilter
     * @method $.ajaxTransport
     * @params options {Object} Options for the ajax call, modified with ajax standard settings
     */
    $.ajaxTransport("+*", function(options){
        if (options.localCache)
        {
            var cacheKey = genCacheKey(options),
                storage = getStorage(options.localCache),
                value = (storage) ? storage.getItem(cacheKey) : false;

            if (value){
                // In the cache? Get it, parse it to json if the dataType is JSON,
                // and call the completeCallback with the fetched value.
                if (options.dataType.toLowerCase().indexOf('json') === 0) value = JSON.parse(value);
                return {
                    send: function(headers, completeCallback) {
                        var response = {};
                        response[options.dataType] = value;
                        completeCallback(200, 'success', response, '');
                    },
                    abort: function() {
                        console.log("Aborted ajax transport for json cache.");
                    }
                };
            }
        }
    });
})(jQuery, window);
