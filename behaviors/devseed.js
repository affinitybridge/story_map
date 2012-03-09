dso.loop = function(m, steps) {
    var loop = {};
    var a;
    var i = 0;
    var hold = 6000;
    var move = 3000;

    loop.cancel = function() {
        easey.cancel();
        if (a) window.clearTimeout(a);
        $('#player').addClass('paused').removeClass('playing');
    };
    loop.go = function(i, callback) {
        easey.slow(m, _({
            time: move,
            callback: callback
        }).extend(steps[i]));
        $('#player .playbar > div').attr('class', 'progress-' + i);
    };
    loop.next = function() {
        loop.cancel();
        i++;
        if (!steps[i]) i = 0;
        loop.go(i);
        return false;
    };
    loop.prev = function() {
        loop.cancel();
        i--;
        if (!steps[i]) i = steps.length;
        loop.go(i);
        return false;
    };
    loop.start = function(restart) {
        var next = function() {
            a = window.setTimeout(function() {
                // Don't move on to next step until all requests are fulfilled.
                // Note: this is not a public API...
                if (m.requestManager.requestQueue.length) return next();
                i++;
                if (!steps[i]) i = 0;
                loop.go(i, next);
            }, restart ? 0 : hold);
            restart = false;
        };
        next();
        $('#player').addClass('playing').removeClass('paused');
    };
    return loop;
};
