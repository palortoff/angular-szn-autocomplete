(function () {
	"use strict";

	var ngModule = angular.module("ngSznAutocomplete", []);

	var Link = function ($q, $timeout, $http, $compile, $templateCache, $scope, $elm, $attrs) {
		this._$q = $q;
		this._$timeout = $timeout;
		this._$http = $http;
		this._$compile = $compile;
		this._$templateCache = $templateCache;
		this._$scope = $scope;
		this._$attrs = $attrs;

		this._$scope.$evalAsync((function ($elm) {
			this._options = this._getOptions();
			this._delayTimeout = null;
			this._deferredResults = null;
			this._previousInputValue = $elm[0].value;

			this._resultsScope = this._$scope.$new(true);
			this._resultsScope.opened = false;
			this._resultsScope.data = {};

			this._dom = {
				input: $elm,
				resultsCont: null,
				parent: this._getParentElm()
			};

			this._init();
		}).bind(this, $elm));
	};

	// default options
	Link.DEFAULT_OPTIONS = {
		templateUrl: "/templ/ng-szn-autocomplete.html",
		focusFirst: false,
		onSelect: null,
		searchMethod: "getAutocompleteResults",
		parentElm: "",
		cssClass: "",
		delay: 100,
		minLength: 2
	};

	Link.IGNORED_KEYS = [13, 17, 16, 18, 20, 37];

	Link.NAVIGATION_KEYS = [9, 38, 39, 40];

	Link.prototype._getOptions = function () {
		var options = {};

		// options set via configuration object in "szn-autocomplete-option" attribute
		var optionsObject = this._$scope[this._$attrs.sznAutocompleteOptions] || {};

		for (var key in this.constructor.DEFAULT_OPTIONS) {
			// the key name with first letter capitalized to make comparision with normalized atribute name easier
			var capKey = key.charAt(0).toUpperCase() + key.slice(1);

			// options set via attributes have highest priority
			options[key] = this._$attrs["sznAutocomplete" + capKey] || optionsObject[key] || this.constructor.DEFAULT_OPTIONS[key];
		}

		if (!this._$scope[options.searchMethod]) {
			throw new Error("ngSznAutocomplete: scope method \"" + options.searchMethod + "\" does not exist.");
		}

		return options;
	};

	Link.prototype._init = function () {
		this._getTemplate()
			.then((function (template) {
				this._dom.resultsCont = angular.element(this._$compile(template)(this._resultsScope));
				this._dom.parent.append(this._dom.resultsCont);
			}).bind(this))
			.then((function () {
				this._dom.input.attr("autocomplete", "off");
				this._dom.input.bind("keyup", this._keyup.bind(this));
				this._dom.input.bind("blur", this._close.bind(this));
			}).bind(this));
	};

	Link.prototype._keyup = function (e) {
		if (this.constructor.IGNORED_KEYS.indexOf(e.keyCode) == -1) {
			if (this.constructor.NAVIGATION_KEYS.indexOf(e.keyCode) != -1) {
				this._navigate(e.keyCode);
			} else if (e.keyCode == 27) {
				this._close();
			} else {
				var query = e.target.value;
				if (query.length >= this._options.minLength) {
					if (this._delayTimeout) {
						this._$timeout.cancel(this._delayTimeout);
					}

					this._delayTimeout = this._$timeout((function () {
						this._getResults(query);
					}).bind(this), this._options.delay);
				} else {
					this._close()
				}
			}
		}
	};

	Link.prototype._getResults = function (query) {
		this._deferredResults = this._$q.defer();
		this._deferredResults.promise.then(
			(function (data) {
				if (!data.results || !data.results.length) {
					this._close();
					return;
				}

				console.log(data);

				for (var key in data) {
					this._resultsScope.data[key] = data[key];
				}

				this._open();
			}).bind(this),
			(function () {
				this._close();
			}).bind(this)
		);

		this._$scope[this._options.searchMethod](query, this._deferredResults);
	};

	Link.prototype._open = function () {
		this._resultsScope.opened = true;
	};

	Link.prototype._close = function () {
		if (this._delayTimeout) {
			this._$timeout.cancel(this._delayTimeout);
		}

		if (this._deferredResults) {
			this._deferredResults.reject();
		}

		this._resultsScope.opened = false;
		this._resultsScope.$digest();
	};

	Link.prototype._navigate = function (key) {

	};

	Link.prototype._getTemplate = function () {
		var deferred = this._$q.defer();

		var template = this._$templateCache.get(this._options.templateUrl);
		if (template) {
			deferred.resolve(template);
		} else {
			this._$http.get(this._options.templateUrl).success(
				(function (deferred, data) { deferred.resolve(data); }).bind(this, deferred)
			);
		}

		return deferred.promise;
	};

	Link.prototype._getParentElm = function () {
		if (this._options.parentElm) {
			var parent = document.querySelector(this._options.parentElm);
			if (!parent) {
				throw new Error("ngSznAutocomplete: CSS selector provided in \"parentElm\" option (\"" + this._options.parentElm + "\") does not match any element.");
			}
			return angular.element(parent);
		} else {
			return this._dom.input.parent();
		}
	};

	ngModule.directive("sznAutocomplete", ["$q", "$timeout", "$http", "$compile", "$templateCache", function ($q, $timeout, $http, $compile, $templateCache) {
		return {
			restrict: "A",
			link: function($scope, $elm, $attrs) {
				return new Link($q, $timeout, $http, $compile, $templateCache, $scope, $elm, $attrs);
			}
		};
	}]);
})();

/**
 * NOTES
 *
 * bude daný formát vrácených dat
 * data bude vracet methoda "searchMethod", která při volání dostane hledaný výraz a promise, kterou po zahledaní resolvne s daty
 * bude existovat jedna až dvě další direktivy pro navěšení funcionalit na na samotných výslecích (zvýrazňování, výběr)
 */
