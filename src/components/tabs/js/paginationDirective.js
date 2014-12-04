(function() {
'use strict';

angular.module('material.components.tabs')
    .directive('mdTabsPagination', TabPaginationDirective);

function TabPaginationDirective($mdConstant, $window, $$rAF, $$q, $timeout) {

  // Must match (2 * width of paginators) in scss
  var PAGINATORS_WIDTH = (8 * 4) * 2;

  return {
    restrict: 'A',
    require: '^mdTabs',
    link: postLink
  };

  function postLink(scope, element, attr, tabsCtrl) {

    var debouncedUpdatePagination = $$rAF.debounce(updatePagination);
    var tabsParent = element.children();
    var state = scope.pagination = {
      page: -1,
      active: false,
      clickNext: function() { userChangePage(+1); },
      clickPrevious: function() { userChangePage(-1); }
    };

    updatePagination();

    scope.$on('$mdTabsChanged', debouncedUpdatePagination);
    angular.element($window).on('resize', debouncedUpdatePagination);

    scope.$on('$destroy', function() {
      angular.element($window).off('resize', debouncedUpdatePagination);
    });

    scope.$watch(tabsCtrl.selected, onSelectedTabChange);
    scope.$watch(function() { return tabsCtrl.tabToFocus; }, onTabFocus);

    // Make sure we don't focus an element on the next page
    // before it's in view
    function onTabFocus(tab, oldTab) {
      if (!tab) return;

      var pageIndex = getPageForTab(tab);
      if (!state.active || pageIndex === state.page) {
        tab.element.focus();
      } else {
        // Go to the new page, wait for the page transition to end, then focus.
        oldTab && oldTab.element.blur();
        setPage(pageIndex).then(function() {
          tab.element.focus();
        });
      }
    }

    function onSelectedTabChange(selectedTab) {
      if (!selectedTab) return;

      if (state.active) {
        var selectedTabPage = getPageForTab(selectedTab);
        setPage(selectedTabPage);
      } else {
        debouncedUpdatePagination();
      }
    }

    // Called when page is changed by a user action (click)
    function userChangePage(increment) {
      var sizeData = state.tabData;
      var newPage = state.page + increment;
      var newTabIndex = sizeData.pages[newPage][ increment > 0 ? 'firstTabIndex' : 'lastTabIndex' ];
      var newTab = tabsCtrl.itemAt(newTabIndex);

      setPage(newPage).then(function() { newTab.element.focus(); });
      tabsCtrl.select(newTab);
    }

    function updatePagination() {
      var tabs = element.find('md-tab');
      var clientWidth = element.parent().prop('clientWidth');
      var tabsWidth = clientWidth - PAGINATORS_WIDTH;

      disablePagination();

      var sizeData = state.tabData = calculateTabData();
      var needPagination = state.active = sizeData.pages.length > 1;

      if (needPagination) { enablePagination(); }

      $timeout(function () { scope.$broadcast('$mdTabsPaginationChanged'); });

      function enablePagination() {
        tabsParent.css('width', '9999px');
        state.pagesCount = sizeData.pages.length;

        //-- apply filler margins
        angular.forEach(sizeData.tabs, function (tab) {
          angular.element(tab.element).css('margin-left', tab.filler + 'px');
        });

        var selectedTabPage = getPageForTab(tabsCtrl.selected());
        setPage(selectedTabPage);
      }

      function disablePagination() {
        slideTabButtons(0);
        tabsParent.css('width', '');
        tabs.css('width', '');
        tabs.css('margin-left', '');
        state.page = -1;
        state.active = false;
      }
    }

    function slideTabButtons(x) {
      if (tabsCtrl.pagingOffset === x) {
        // Resolve instantly if no change
        return $$q.when();
      }

      var deferred = $$q.defer();

      tabsCtrl.$$pagingOffset = x;
      tabsParent.css($mdConstant.CSS.TRANSFORM, 'translate3d(' + x + 'px,0,0)');
      tabsParent.on($mdConstant.CSS.TRANSITIONEND, onTabsParentTransitionEnd);

      return deferred.promise;

      function onTabsParentTransitionEnd(ev) {
        // Make sure this event didn't bubble up from an animation in a child element.
        if (ev.target === tabsParent[0]) {
          tabsParent.off($mdConstant.CSS.TRANSITIONEND, onTabsParentTransitionEnd);
          deferred.resolve();
        }
      }
    }

    function calculateTabData() {
      var clientWidth = element.parent().prop('clientWidth');
      var tabsWidth = clientWidth - PAGINATORS_WIDTH - 1;
      var tabs = element[0].querySelectorAll('md-tab');
      var totalWidth = 0;
      var max = 0;
      var originalWidth = element.parent().css('width');
      var tabData = [];
      var pages = [];
      var currentPage;

      element.parent().css('width', '9999px');
      angular.element(tabs).css('max-width', '');
      angular.forEach(tabs, function (tab, index) {
        var tabWidth = Math.min(tabsWidth, tab.offsetWidth);
        var data = {
          element: tab,
          left: totalWidth,
          width: tabWidth,
          right: totalWidth + tabWidth,
          filler: 0
        };
        //-- store 1-based page number
        data.page = Math.ceil(data.right / tabsWidth);
        if (data.page > pages.length) {
          data.filler = (tabsWidth * (data.page - 1)) - data.left;
          data.right += data.filler;
          data.left += data.filler;
          currentPage = {
            left: data.left,
            firstTabIndex: index,
            lastTabIndex: index,
            tabs: [ tab ]
          };
          pages.push(currentPage);
        } else {
          currentPage.lastTabIndex = index;
          currentPage.tabs.push(tab);
        }
        totalWidth = data.right;
        max = Math.max(max, tabWidth);
        tabData.push(data);
      });
      element.parent().css('width', originalWidth);
      angular.element(tabs).css('max-width', tabsWidth + 'px');

      return {
        width: totalWidth,
        max: max,
        tabs: tabData,
        pages: pages
      };
    }

    function getPageForTab(tab) {
      var tabIndex = tabsCtrl.indexOf(tab);
      if (tabIndex === -1) return 0;

      var sizeData = state.tabData;

      return sizeData.tabs[tabIndex].page - 1;
    }

    function setPage(page) {
      if (page === state.page) return;

      var lastPage = state.pagesCount;

      if (page < 0) page = 0;
      if (page > lastPage) page = lastPage;

      state.hasPrev = page > 0;
      state.hasNext = page < state.tabData.pages.length - 1;

      state.page = page;

      scope.$broadcast('$mdTabsPaginationChanged');

      return slideTabButtons(-state.tabData.pages[page].left);
    }
  }

}
})();
