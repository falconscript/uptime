/**
 * Module dependencies.
 */

var util = require('util');
var url  = require('url');
var BasePoller = require('../basePoller');
//var WebPageTest = require('webpagetest'); // This is a nodejs module, not written by uptime.
var config = require('config');

/**
 * NmapPoller Poller, to perform NmapPoller analysis on web pages
 *
 * @param {Mixed} Poller Target (e.g. URL)
 * @param {Number} Poller timeout in milliseconds. Without response before this duration, the poller stops and executes the error callback.
 * @param {Function} Error/success callback
 * @api   public
 */
function NmapPoller(target, timeout, callback) {
  NmapPoller.super_.call(this, target, timeout, callback);
}

util.inherits(NmapPoller, BasePoller);

NmapPoller.type = 'nmappoller';

NmapPoller.validateTarget = function(target) {
  return target.replace(/http[s]*:\/\//g, '').replace(/[^a-zA-Z0-9\.\ \-\_]/g, '').length > 3;
  //return url.parse(target).protocol == 'http:';
};

NmapPoller.prototype.initialize = function() {
  this.timeout = 999999; // We can't know a test duration

  // Only instantiates the variable...?
  //this.wpt = new WebPageTest(config.webPageTest.server || 'www.webpagetest.org', config.webPageTest.key);
};

/**
 * Launch the actual polling
 *
 * @api   public
 */
NmapPoller.prototype.poll = function() {
  NmapPoller.super_.prototype.poll.call(this); // Starts timer
  this.debug('NmapPoller start test [target='+this.target+']');

  // webpagetest.run(target, config, callback[err,data] ) WON'T BE USING THIS.
  //this.wpt.runTest(this.target, config.webPageTest.testOptions || {}, this.onTestStartedCallback.bind(this));

  // RUN NMAP GET STDOUT
  require('child_process').exec(
    "nmap -p137,139,445 -PR " + this.target.replace(/http[s]*:\/\//g, '').replace(/[^a-zA-Z0-9\.\ \-\_]/g, ''),
    this.onTestStartedCallback.bind(this)
  );
};

/**
 * Test started callback
 *
 * @api   private
 */
NmapPoller.prototype.onTestStartedCallback = function(returnCode, stdout, stderr){
//  sys.puts(stdout);
  this.debug(stdout);

  if (returnCode && returnCode != 0) {
    console.log('[!] nmap call failed! nmap return code was: ', returnCode, stdout, stderr);
    this.timer.stop();
    return this.onErrorCallback({ name: "NMAP FAILED TO POLL", message: stderr});
  } else {
    // If host was up
    try {
      if (parseInt((stdout + stderr).match(/\d*\ host[s]*\ up/, '')[0].match(/^\d*/)) == 1) {
        //this.testId = data.data.testId; //webpagepoller thing
        // Could do
        // this.userUrl = stdout.match(/Nmap\ scan\ report\ for\ .*$/)[0].replace(/Nmap\ scan\ report\ for\ /g, '');
        //if (data.data.userUrl) { this.userUrl = data.data.userUrl; }
        this.debug('NmapPoller test ran [testId='+this.testId+']');
        //this.checkTestStatus();

        this.timer.stop();
        this.debug(this.getTime() + 'ms - Got Nmap response');
        this.callback(null, this.getTime(), {});
        //this.callback(null, docTime, {});
      } else {
        return this.onErrorCallback({ name: "Something wrong happened... Nmap test not started?", message: stderr});
      }
    } catch (e) {
        console.log('[!] nmap JSexception - ', e, '\nreturn code was: ', returnCode, 'out: ', stdout, 'err: ', stderr);
    }
  }
};

/**
 * TestStatus callback
 *
 * @api   private
 */
 // I don't think we need this
NmapPoller.prototype.checkTestStatus = function(){
  var self = this;
  this.wpt.getTestStatus(this.testId, function(err, data) {
    if (err) {
      self.debug('NmapPoller checkTestStatus error');
      self.timer.stop();
      return;
    }
    if (data && data.statusCode == 200) {
      // this.wpt IS UNDEFINED
      self.wpt.getTestResults(self.testId, function(err, data) {
        var docTime = parseInt(data.response.data.average.firstView.docTime, 10);
        self.debug('NmapPollerResults received [docTime=' + docTime + ']');
        self.timer.stop();
        if (self.userUrl) {
          self.callback(null, docTime, {}, { url: self.userUrl });
        } else {
          self.callback(null, docTime, {});
        }
      });
    } else {
      self.testStatusTimeout = setTimeout(self.checkTestStatus.bind(self), 5000);
    }
  });
};

/**
 * Timeout callback
 *
 * @api   private
 */
NmapPoller.prototype.timeoutReached = function() {
  this.debug('NmapPoller timeoutReached call... not sure how this happened');
  NmapPoller.super_.prototype.timeoutReached.call(this);
  var self = this;

  // No idea why we'd use this
  /*if (typeof this.timeout !== undefined) {
    this.wpt.cancelTest(this.testId, function(err,data) {
      self.debug('NmapPoller test started [testId=' + self.testId + ']');
    });
  }*/
};

module.exports = NmapPoller;
