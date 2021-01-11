import localize from '../helpers/localize.js'
import picoModal from '../helpers/picoModal.js'

export default function showNotFoundModal(program) {
    return picoModal({
        width: 400,
        content: "<div style='padding:20px'><h4 style='font-weight:bold;margin-top:0'>[instantgram]<span style='float:right;'>v" + program.VERSION + "</span></h4><br/>" +
            "<p style='margin:0;text-align:center'>" + localize('index#program@alert_dontFound') + "</p>" +
            "</div>" +
            "<div class='footer' style='display:block;bottom:0;background:#efefef;width:100%;left:0;padding:10px;box-sizing:border-box;margin:0;text-align:right;'>" +
            "<button class='ok' style='width:50px;cursor:pointer;'>Ok</button>" +
            "</div>"
    }).afterCreate(modal => {
        modal.modalElem().addEventListener("click", evt => {
            if (evt.target && evt.target.matches(".ok")) {
                modal.close(true)
            }
        })
    }).afterClose((modal, evt) => {
        modal.destroy()
    }).show()
}