import { Program } from '../App'
import localize from './localize'
import picoModal from './picoModal'

export default function showModal(html: String, program: Program): void {
    return picoModal({
        width: 400,
        content: html
    }).afterCreate(modal => {
        modal.modalElem().addEventListener('click', evt => {
            if (evt.target && evt.target.matches('.ok')) {
                modal.close(true)
            }
        })
    }).afterClose((modal, evt) => {
        modal.destroy()
    }).show()
}