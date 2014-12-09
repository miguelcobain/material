(function() {
'use strict';

/**
 * @private
 * @ngdoc module
 * @name material.components.switch
 */

angular.module('material.components.switch', [
  'material.core',
  'material.components.checkbox'
])
  .directive('mdSwitch', MdSwitch);

/**
 * @private
 * @ngdoc directive
 * @module material.components.switch
 * @name mdSwitch
 * @restrict E
 *
 * The switch directive is used very much like the normal [angular checkbox](https://docs.angularjs.org/api/ng/input/input%5Bcheckbox%5D).
 *
 * @param {string} ng-model Assignable angular expression to data-bind to.
 * @param {string=} name Property name of the form under which the control is published.
 * @param {expression=} ng-true-value The value to which the expression should be set when selected.
 * @param {expression=} ng-false-value The value to which the expression should be set when not selected.
 * @param {string=} ng-change Angular expression to be executed when input changes due to user interaction with the input element.
 * @param {boolean=} md-no-ink Use of attribute indicates use of ripple ink effects.
 * @param {string=} aria-label Publish the button label used by screen-readers for accessibility. Defaults to the switch's text.
 *
 * @usage
 * <hljs lang="html">
 * <md-switch ng-model="isActive" aria-label="Finished?">
 *   Finished ?
 * </md-switch>
 *
 * <md-switch md-no-ink ng-model="hasInk" aria-label="No Ink Effects">
 *   No Ink Effects
 * </md-switch>
 *
 * <md-switch ng-disabled="true" ng-model="isDisabled" aria-label="Disabled">
 *   Disabled
 * </md-switch>
 *
 * </hljs>
 */
function MdSwitch(mdCheckboxDirective, $mdTheming, $mdUtil, $document, $mdConstant, $parse) {
  var checkboxDirective = mdCheckboxDirective[0];

  return {
    restrict: 'E',
    transclude: true,
    template:
      '<div class="md-container">' +
        '<div class="md-bar"></div>' +
        '<div class="md-thumb-container">' +
          '<div class="md-thumb" md-ink-ripple md-ink-ripple-checkbox></div>' +
        '</div>'+
      '</div>' +
      '<div class="md-text" ng-transclude>' +
      '</div>',
    require: '?ngModel',
    compile: compile
  };

  function compile(element, attr) {
    var checkboxLink = checkboxDirective.compile(element, attr);

    return function (scope, element, attr, ngModel) {
      ngModel = ngModel || $mdUtil.fakeNgModel();
      var disabledGetter = $parse(attr.ngDisabled);
      var thumbContainer = angular.element(element[0].querySelector('.md-thumb-container'));
      var elementWidth;

      // Tell the checkbox we don't want a click listener.
      // Our drag listener tells us everything, using more granular events.
      attr.noClick = true; 
      checkboxLink(scope, element, attr, ngModel);

      setupDrag(element, {
        onDragStart: onDragStart,
        onDrag: onDrag,
        onDragEnd: onDragEnd
      });

      function onDragStart(ev, drag) {
        // Don't go if ng-disabled===true
        if (disabledGetter(scope)) return false;
        elementWidth = thumbContainer.prop('offsetWidth');
        element.addClass('no-animate');
      }
      function onDrag(ev, drag) {
        var percent = drag.distance / elementWidth;

        var translate = ngModel.$viewValue ?
          1 - percent : //if checked, start from right
          -percent; // else, start from left
        translate = Math.max(0, Math.min(1, translate));

        thumbContainer.css($mdConstant.CSS.TRANSFORM, 'translate3d(' + (100*translate) + '%,0,0)');
        drag.translate = translate;
      }
      function onDragEnd(ev, drag) {
        if (disabledGetter(scope)) return false;

        element.removeClass('no-animate');
        thumbContainer.css($mdConstant.CSS.TRANSFORM, '');

        // We changed if there is no distance (this is a click a click),
        // or if the drag distance is >50% of the total.
        var isChanged = Math.abs(drag.distance) < 5 ||
          ngModel.$viewValue ? drag.translate < 0.5 : drag.translate > 0.5;
        if (isChanged) {
          scope.$apply(function() {
            ngModel.$setViewValue(!ngModel.$viewValue);
            ngModel.$render();
          });
        }
      }
    };
  }

  function setupDrag(element, options) {
    // The state of the current drag
    var drag;
    // Whether the pointer is currently down on this element.
    var pointerIsDown;

    var START_EVENTS = 'mousedown touchstart pointerdown';
    var MOVE_EVENTS = 'mousemove touchmove pointermove';
    var END_EVENTS = 'mouseup mouseleave touchend touchcancel pointerup pointercancel';

    // TODO implement vertical/horizontal drag if needed
    options = angular.extend({
      onDragStart: angular.noop,
      onDrag: angular.noop,
      onDragEnd: angular.noop
    }, options);

    element.on(START_EVENTS, startDrag);

    // Listen to move and end events on document. End events especially could have bubbled up
    // from the child.
    $document.on(MOVE_EVENTS, doDrag)
      .on(END_EVENTS, endDrag);

    element.on('$destroy', function() {
      $document.off(MOVE_EVENTS, doDrag)
        .off(END_EVENTS, endDrag);
    });
    
    function startDrag(ev) {
      if (pointerIsDown) return;
      pointerIsDown = true;

      drag = {
        // Restrict this drag to whatever started it: if a mousedown started the drag,
        // don't let anything but mouse events continue it.
        pointerType: ev.type.charAt(0),
        startX: getPosition(ev),
        startTime: $mdUtil.now()
      };
      // Allow user to cancel by returning false
      if (options.onDragStart(ev, drag) === false) {
        drag = null;
      }
    }
    function doDrag(ev) {
      if (!drag || !isProperEventType(ev)) return;

      updateDrag(ev);

      // Allow user to cancel by returning false
      if (options.onDrag(ev, drag) === false) {
        endDrag(ev);
      }
    }
    function endDrag(ev) {
      pointerIsDown = false;
      if (!drag || !isProperEventType(ev)) return;

      updateDrag(ev);
      options.onDragEnd(ev, drag);
      drag = null;
    }

    function updateDrag(ev) {
      var x = getPosition(ev);
      drag.distance = drag.startX - x;
      drag.direction = drag.distance > 0 ? 'left' : (drag.distance < 0 ? 'right' : '');
      drag.time = drag.startTime - $mdUtil.now();
      drag.velocity = Math.abs(drag.distance) / drag.time;
    }
    function getPosition(ev) {
      ev = ev.originalEvent || ev; //suport jQuery events
      return (ev.touches ? ev.touches[0] : ev).pageX;
    }
    function isProperEventType(ev) {
      return drag && ev && (ev.type || '').charAt(0) == drag.pointerType;
    }
  }

}

})();
