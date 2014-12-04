(function() {
'use strict';

/**
 * Conditionally configure ink bar animations when the
 * tab selection changes. If `mdNoBar` then do not show the
 * bar nor animate.
 */
angular.module('material.components.tabs')
  .directive('mdTabsInkBar', MdTabInkDirective);

function MdTabInkDirective($mdConstant, $window, $$rAF, $timeout) {

  return {
    restrict: 'E',
    require: ['^?mdNoBar', '^mdTabs'],
    link: postLink
  };

  function postLink(scope, element, attr, ctrls) {
    var noBar = ctrls[0],
        tabsCtrl = ctrls[1],
        timeout;

    if (noBar) return;

    tabsCtrl.inkBarElement = element;

    scope.$watch(tabsCtrl.selected, updateBar);
    scope.$on('$mdTabsPaginationChanged', updateBar);
    scope.$on('$mdTabsChanged', updateBar);

    function updateBar() {
      var selected = tabsCtrl.selected();
      var hideInkBar = !selected
          || tabsCtrl.count() < 2
          || (scope.pagination || {}).itemsPerPage === 1;

      element.css('display', hideInkBar ? 'none' : 'block');

      if (!hideInkBar) {
        var index = tabsCtrl.indexOf(selected);
        var data = scope.pagination.tabData.tabs[index] || { left: 0, right: 0, width: 0 };

        element.css($mdConstant.CSS.TRANSFORM, 'translate3d(' + data.left + 'px, 0, 0)');
        element.css('width', data.width + 'px');
        if (data.width) {
          element.addClass('md-ink-bar-grow');
          if (timeout) $timeout.cancel(timeout);
          timeout = $timeout(function () {
            element.removeClass('md-ink-bar-grow');
          }, 250, false);
        }
      }
    }
  }
}
})();
